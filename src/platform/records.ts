import {
  maintenanceTasks,
  taskStates,
  validateCompletion,
} from "./maintenance";
import { Hono } from "hono";
import {
  Env,
  who,
  uid,
  now,
  fail,
  str,
  number,
  choice,
  stmt,
  row,
  rows,
  access,
  audit,
  notifyPool,
  professionalAccess,
  readings,
  instant,
  jsonParse,
  cursor,
  page,
  date,
} from "./core";
import { cleanImage } from "./uploads";
export const records = new Hono<Env>();
async function visibleRecord(c: any, id: string) {
  const r = await row<any>(c, "SELECT * FROM records WHERE id=?", id);
  if (!r) fail("Compte rendu inaccessible.", 404);
  const p = await access(c, r.pool_id);
  if (!r.published_at && r.author_id !== who(c).id)
    fail("Compte rendu inaccessible.", 404);
  return { r, p };
}
function recordBody(b: any, template?: any[]) {
  const list = template
    ? taskStates(template, b.checklist)
    : Array.isArray(b.checklist)
      ? b.checklist.slice(0, 30).map((v: any) => ({
          label: str(v.label, 150, true),
          done: v.done === true,
        }))
      : [];
  return {
    measured: instant(b.measured_at),
    readings: JSON.stringify(readings(b.readings)),
    method: str(b.method, 100),
    notes: str(b.notes, 4000),
    products: str(b.products, 2000),
    checklist: JSON.stringify(list),
    duration: number(b.duration, 1, 1440),
  };
}
const decode = (r: any) => ({
  ...r,
  readings: jsonParse(r.readings),
  checklist: jsonParse(r.checklist, []),
});
records.get("/pools/:id/records", async (c) => {
  const p = await access(c, c.req.param("id"));
  const { limit, cursor: after } = cursor(c);
  const binds: any[] = [p.id, who(c).id];
  let filter = "";
  if (after) {
    const previous = await row<any>(
      c,
      "SELECT measured_at,id FROM records WHERE id=? AND pool_id=? AND (published_at IS NOT NULL OR author_id=?)",
      after,
      p.id,
      who(c).id,
    );
    if (previous) {
      filter = " AND (r.measured_at<? OR (r.measured_at=? AND r.id<?))";
      binds.push(previous.measured_at, previous.measured_at, previous.id);
    } else fail("Page introuvable.");
  }
  binds.push(limit + 1);
  const list = await rows(
    c,
    `SELECT r.*,(SELECT x.id FROM records x WHERE x.correction_of=r.id AND x.published_at IS NOT NULL) superseded_by FROM records r WHERE r.pool_id=? AND (r.published_at IS NOT NULL OR r.author_id=?) ${filter} ORDER BY r.measured_at DESC,r.id DESC LIMIT ?`,
    ...binds,
  );
  return c.json(page(list.map(decode), limit));
});
records.get("/pools/:id/trends", async (c) => {
  const p = await access(c, c.req.param("id"));
  const days = number(c.req.query("days"), 7, 1825, 180)!;
  const start = new Date(Date.now() - days * 86400000).toISOString();
  const list = await rows(
    c,
    "SELECT substr(r.measured_at,1,10) date,avg(json_extract(r.readings,'$.ph')) ph,avg(json_extract(r.readings,'$.chlorine')) chlorine,count(*) samples FROM records r WHERE r.pool_id=? AND r.published_at IS NOT NULL AND r.measured_at>=? AND NOT EXISTS(SELECT 1 FROM records x WHERE x.correction_of=r.id AND x.published_at IS NOT NULL) GROUP BY substr(r.measured_at,1,10) ORDER BY date LIMIT 1826",
    p.id,
    start,
  );
  return c.json({
    items: list,
    aggregation:
      "Moyennes par jour ; les mesures originales restent dans le journal.",
    thresholds: jsonParse(p.thresholds),
  });
});
records.post("/pools/:id/records", async (c) => {
  const p = await access(c, c.req.param("id")),
    b = await c.req.json(),
    u = who(c);
  const kind = choice(b.kind, ["analysis", "visit"] as const, "analysis");
  if (kind === "visit") professionalAccess(c, p);
  const id = b.id ? str(b.id, 36, true) : uid();
  if (!/^[a-f\d-]{36}$/.test(id)) fail("Identifiant de saisie invalide.");
  const existing = await row<any>(
    c,
    "SELECT id,pool_id,author_id FROM records WHERE id=?",
    id,
  );
  if (existing) {
    if (existing.pool_id !== p.id || existing.author_id !== u.id)
      fail("Identifiant déjà utilisé.", 409);
    return c.json({ id, replayed: true });
  }
  let template = kind === "visit" ? maintenanceTasks(p) : undefined;
  let checklistVersion = kind === "visit" ? 1 : 0;
  let appointment = null;
  if (b.appointment_id) {
    appointment = await row<any>(
      c,
      `SELECT id FROM appointments WHERE id=? AND pool_id=? AND pro_id=? AND ${b.correction_of ? "status IN('planned','done')" : "status='planned'"}`,
      str(b.appointment_id, 36, true),
      p.id,
      u.id,
    );
    if (!appointment) fail("Rendez-vous indisponible.");
  }
  let correction = null;
  if (b.correction_of) {
    const old = await row<any>(
      c,
      "SELECT * FROM records WHERE id=? AND pool_id=? AND author_id=? AND published_at IS NOT NULL",
      str(b.correction_of, 36, true),
      p.id,
      u.id,
    );
    if (!old) fail("Seul l’auteur peut corriger ce compte rendu.", 403);
    if (old.kind !== kind) fail("Une correction conserve le type du relevé.");
    if (appointment && appointment.id !== old.appointment_id)
      fail("Une correction conserve le rendez-vous d’origine.");
    correction = old.id;
    if (kind === "visit") {
      checklistVersion = old.checklist_version;
      template =
        old.checklist_version === 1 ? jsonParse(old.checklist, []) : undefined;
    }
  }
  const v = recordBody(b, template);
  await c.env.DB.batch([
    stmt(
      c,
      "INSERT INTO records(id,pool_id,author_id,author_name,kind,measured_at,readings,method,notes,products,checklist,duration,appointment_id,correction_of,checklist_version) VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)",
      id,
      p.id,
      u.id,
      u.name,
      kind,
      v.measured,
      v.readings,
      v.method,
      v.notes,
      v.products,
      v.checklist,
      v.duration,
      appointment?.id || null,
      correction,
      checklistVersion,
    ),
    audit(c, "record.drafted", p.id, id),
  ]);
  return c.json({ id }, 201);
});
records.get("/records/:id", async (c) => {
  const { r } = await visibleRecord(c, c.req.param("id"));
  const photos = await rows(
    c,
    "SELECT id,caption,mime FROM photos WHERE record_id=?",
    r.id,
  );
  return c.json({ ...decode(r), photos });
});
records.put("/records/:id", async (c) => {
  const { r } = await visibleRecord(c, c.req.param("id"));
  if (r.author_id !== who(c).id || r.published_at)
    fail("Crée une correction pour modifier un compte rendu publié.", 403);
  const b = await c.req.json(),
    v = recordBody(
      b,
      r.checklist_version === 1 ? jsonParse(r.checklist, []) : undefined,
    );
  const res = await stmt(
    c,
    "UPDATE records SET measured_at=?,readings=?,method=?,notes=?,products=?,checklist=?,duration=?,revision=revision+1 WHERE id=? AND revision=? AND published_at IS NULL",
    v.measured,
    v.readings,
    v.method,
    v.notes,
    v.products,
    v.checklist,
    v.duration,
    r.id,
    number(b.revision, 1, 100000, 1),
  ).run();
  if (!res.meta.changes)
    fail("Ce brouillon a changé. Recharge-le avant de modifier.", 409);
  return c.json({ ok: true, revision: r.revision + 1 });
});
records.post("/records/:id/publish", async (c) => {
  const { r, p } = await visibleRecord(c, c.req.param("id"));
  if (r.author_id !== who(c).id)
    fail("Seul l’auteur peut partager ce compte rendu.", 403);
  if (r.published_at) return c.json({ ok: true, replayed: true });
  if (r.kind === "visit" && r.checklist_version === 1)
    validateCompletion(jsonParse(r.checklist, []), jsonParse(r.readings));
  const at = now();
  const published = await c.env.DB.batch([
    stmt(
      c,
      "UPDATE records SET published_at=? WHERE id=? AND published_at IS NULL AND revision=? AND EXISTS(SELECT 1 FROM pool_members m JOIN pools p ON p.id=m.pool_id WHERE m.pool_id=records.pool_id AND m.user_id=records.author_id AND m.revoked_at IS NULL AND p.archived_at IS NULL AND (m.kind='principal' OR (records.kind='analysis' AND m.kind='owner')))",
      at,
      r.id,
      r.revision,
    ),
    stmt(
      c,
      `INSERT INTO notifications(id,user_id,type,title,body,pool_id) SELECT lower(hex(randomblob(16))),m.user_id,'report',?,?,m.pool_id FROM pool_members m WHERE m.pool_id=? AND m.user_id!=? AND m.revoked_at IS NULL AND (m.expires_at IS NULL OR m.expires_at>?) AND changes()=1 AND (SELECT published_at FROM records WHERE id=?)=?`,
      r.kind === "visit"
        ? "Un passage vient d’être partagé"
        : "Une nouvelle analyse est disponible",
      p.name,
      p.id,
      who(c).id,
      at,
      r.id,
      at,
    ),
    ...(r.appointment_id
      ? [
          stmt(
            c,
            "UPDATE appointments SET status='done' WHERE id=? AND pro_id=? AND EXISTS(SELECT 1 FROM records WHERE id=? AND published_at=? AND revision=?)",
            r.appointment_id,
            who(c).id,
            r.id,
            at,
            r.revision,
          ),
        ]
      : []),
    audit(c, "record.published", p.id, r.id),
  ]);
  if (!published[0].meta.changes)
    fail(
      "Le brouillon ou vos accès ont changé. Rouvrez le passage avant de partager.",
      409,
    );
  return c.json({ ok: true });
});
records.post("/records/:id/photos", async (c) => {
  const { r, p } = await visibleRecord(c, c.req.param("id"));
  if (r.author_id !== who(c).id || r.published_at)
    fail("Ajoute les photos au brouillon avant de le partager.", 403);
  const count = await row<{ n: number }>(
    c,
    "SELECT count(*) n FROM photos WHERE record_id=?",
    r.id,
  );
  if ((count?.n || 0) >= 6) fail("Maximum six photos par compte rendu.");
  const form = await c.req.formData(),
    file = form.get("file") as File | string | null;
  if (!file || typeof file === "string") fail("Sélectionne une photo.");
  if (file.size > 4 * 1024 * 1024)
    fail("Photo trop lourde (4 Mo maximum).", 413);
  const clean = cleanImage(new Uint8Array(await file.arrayBuffer()));
  const id = uid(),
    key = `platform/${p.id}/${id}`;
  await c.env.PHOTOS.put(key, clean.data, {
    httpMetadata: { contentType: clean.mime },
  });
  try {
    const inserted = await stmt(
      c,
      "INSERT INTO photos(id,pool_id,record_id,author_id,r2_key,caption,mime,size) SELECT ?,?,?,?,?,?,?,? WHERE (SELECT count(*) FROM photos WHERE record_id=?)<6 AND EXISTS(SELECT 1 FROM records WHERE id=? AND published_at IS NULL)",
      id,
      p.id,
      r.id,
      who(c).id,
      key,
      str(form.get("caption"), 200),
      clean.mime,
      clean.data.byteLength,
      r.id,
      r.id,
    ).run();
    if (!inserted.meta.changes)
      fail("Le brouillon a été publié ou possède déjà six photos.", 409);
  } catch (e) {
    await c.env.PHOTOS.delete(key);
    throw e;
  }
  return c.json({ id }, 201);
});
records.get("/photos/:id", async (c) => {
  const photo = await row<any>(
    c,
    "SELECT * FROM photos WHERE id=?",
    c.req.param("id"),
  );
  if (!photo) fail("Photo inaccessible.", 404);
  await visibleRecord(c, photo.record_id);
  const object = await c.env.PHOTOS.get(photo.r2_key);
  if (!object) fail("Photo indisponible.", 404);
  return new Response(object.body, {
    headers: {
      "Content-Type": photo.mime,
      "Cache-Control": "no-store",
      "X-Content-Type-Options": "nosniff",
      "Content-Disposition": "inline",
    },
  });
});
records.delete("/photos/:id", async (c) => {
  const photo = await row<any>(
    c,
    "SELECT * FROM photos WHERE id=?",
    c.req.param("id"),
  );
  if (!photo) fail("Photo inaccessible.", 404);
  const { r } = await visibleRecord(c, photo.record_id);
  if (r.published_at || r.author_id !== who(c).id)
    fail("Photo publiée : utilise un compte rendu corrigé.", 403);
  await stmt(c, "DELETE FROM photos WHERE id=?", photo.id).run();
  await c.env.PHOTOS.delete(photo.r2_key);
  return c.json({ ok: true });
});
records.get("/pools/:id/needs", async (c) => {
  const p = await access(c, c.req.param("id"));
  return c.json({
    items: await rows(
      c,
      "SELECT * FROM needs WHERE pool_id=? ORDER BY CASE status WHEN 'needed' THEN 0 WHEN 'ready' THEN 1 ELSE 2 END,due_date,id LIMIT 200",
      p.id,
    ),
  });
});
records.post("/pools/:id/needs", async (c) => {
  const p = await access(c, c.req.param("id")),
    b = await c.req.json();
  const responsible = choice(b.responsible, ["client", "pro"] as const),
    id = uid();
  const title = str(b.title, 120, true),
    quantity = str(b.quantity, 60);
  await c.env.DB.batch([
    stmt(
      c,
      "INSERT INTO needs(id,pool_id,created_by,title,category,quantity,responsible,due_date) VALUES(?,?,?,?,?,?,?,?)",
      id,
      p.id,
      who(c).id,
      title,
      choice(b.category, ["product", "equipment"] as const, "product"),
      quantity,
      responsible,
      date(b.due_date, false) || null,
    ),
    notifyPool(
      c,
      p.id,
      "supply",
      responsible === "client"
        ? "Un achat est à prévoir pour votre piscine"
        : "Votre pisciniste prévoit un approvisionnement",
      `${title}${quantity ? " · " + quantity : ""}`,
    ),
    audit(c, "need.created", p.id, id),
  ]);
  return c.json({ id }, 201);
});
records.put("/needs/:id", async (c) => {
  const n = await row<any>(
    c,
    "SELECT * FROM needs WHERE id=?",
    c.req.param("id"),
  );
  if (!n) fail("Besoin introuvable.", 404);
  await access(c, n.pool_id);
  const b = await c.req.json(),
    status = choice(b.status, [
      "needed",
      "ready",
      "delivered",
      "cancelled",
    ] as const);
  const revision = number(b.revision, 1, 100000)!;
  const result = await c.env.DB.batch([
    stmt(
      c,
      "UPDATE needs SET status=?,revision=revision+1 WHERE id=? AND revision=?",
      status,
      n.id,
      revision,
    ),
    stmt(
      c,
      `INSERT INTO notifications(id,user_id,type,title,body,pool_id) SELECT lower(hex(randomblob(16))),m.user_id,'supply',?,?,m.pool_id FROM pool_members m WHERE m.pool_id=? AND m.user_id!=? AND m.revoked_at IS NULL AND (m.expires_at IS NULL OR m.expires_at>?) AND changes()=1`,
      status === "delivered"
        ? n.responsible === "pro"
          ? "Un produit ou matériel a été apporté"
          : "Un achat client est disponible"
        : status === "ready"
          ? "Un approvisionnement est prêt"
          : status === "cancelled"
            ? "Un besoin a été annulé"
            : "Un achat reste à prévoir",
      n.title,
      n.pool_id,
      who(c).id,
      now(),
    ),
    audit(c, "need.updated", n.pool_id, n.id),
  ]);
  if (!result[0].meta.changes)
    fail("Ce besoin a changé. Recharge la page.", 409);
  return c.json({ ok: true });
});

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
  notify,
  notifyPool,
  ACTIVE,
  place,
  publicUser,
  jsonParse,
  date,
  cursor,
  page,
} from "./core";
export const pools = new Hono<Env>();
pools.get("/places", async (c) => {
  const q = str(c.req.query("q"), 60, true);
  if (q.length < 2) return c.json([]);
  const url = new URL("https://geo.api.gouv.fr/communes");
  url.searchParams.set(/^\d{5}$/.test(q) ? "codePostal" : "nom", q);
  url.searchParams.set("fields", "nom,code,codesPostaux");
  url.searchParams.set("boost", "population");
  url.searchParams.set("limit", "8");
  const r = await fetch(url, { signal: AbortSignal.timeout(5000) });
  if (!r.ok) fail("La recherche de commune est indisponible.", 503);
  return c.json(await r.json());
});
pools.get("/professionals", async (c) => {
  const q = str(c.req.query("q"), 80);
  if (q.length < 2) return c.json({ items: [] });
  return c.json({
    items: await rows(
      c,
      "SELECT id,username,name,company,city,specialties FROM users WHERE is_pro=1 AND disabled=0 AND (username=? OR name LIKE ? OR company LIKE ?) ORDER BY company,name LIMIT 20",
      q,
      `%${q.replace(/[%_]/g, "")}%`,
      `%${q.replace(/[%_]/g, "")}%`,
    ),
  });
});
pools.get("/pools", async (c) => {
  const { limit, cursor: after } = cursor(c);
  const mode = choice(
    c.req.query("mode"),
    ["client", "pro"] as const,
    "client",
  );
  let q = `SELECT p.id,p.name,p.kind,p.city,p.treatment,p.volume,p.winterized,m.kind membership,m.manager,(SELECT max(r.measured_at) FROM records r WHERE r.pool_id=p.id AND r.published_at IS NOT NULL) last_reading FROM pools p JOIN pool_members m ON m.pool_id=p.id WHERE m.user_id=? AND ${ACTIVE} AND p.archived_at IS NULL AND ${mode === "client" ? "m.kind='owner'" : "m.kind IN('principal','temporary')"}`;
  const binds: any[] = [who(c).id];
  if (after) {
    q += " AND p.id>?";
    binds.push(after);
  }
  const search = str(c.req.query("q"), 100);
  if (search) {
    q += " AND (p.name LIKE ? OR p.city LIKE ?)";
    binds.push(
      `%${search.replace(/[%_]/g, "")}%`,
      `%${search.replace(/[%_]/g, "")}%`,
    );
  }
  q += " ORDER BY p.id LIMIT ?";
  binds.push(limit + 1);
  return c.json(page(await rows(c, q, ...binds), limit));
});
pools.post("/pools", async (c) => {
  const b = await c.req.json(),
    u = who(c),
    id = uid();
  const p = b.city_code ? await place(str(b.city_code, 5, true)) : null;
  await c.env.DB.batch([
    stmt(
      c,
      "INSERT INTO pools(id,name,kind,city_code,city,latitude,longitude,address,volume,treatment,created_by) VALUES(?,?,?,?,?,?,?,?,?,?,?)",
      id,
      str(b.name, 80, true),
      choice(
        b.kind,
        [
          "private",
          "rental",
          "residence",
          "hotel",
          "camping",
          "public",
          "other",
        ] as const,
        "private",
      ),
      p?.code || null,
      p?.name || null,
      p?.lat ?? null,
      p?.lng ?? null,
      str(b.address, 300),
      number(b.volume, 0.1, 100000),
      choice(
        b.treatment,
        ["unknown", "chlorine", "salt", "bromine", "oxygen", "other"] as const,
        "unknown",
      ),
      u.id,
    ),
    stmt(
      c,
      "INSERT INTO pool_members(id,pool_id,user_id,kind,manager) VALUES(?,?,?,'owner',1)",
      uid(),
      id,
      u.id,
    ),
    audit(c, "pool.created", id, id),
  ]);
  return c.json({ id }, 201);
});
pools.get("/pools/:id", async (c) => {
  const p = await access(c, c.req.param("id"));
  const members = await rows(
    c,
    `SELECT m.id,m.user_id,m.kind,m.manager,m.expires_at,u.name,u.company,u.username FROM pool_members m JOIN users u ON u.id=m.user_id WHERE m.pool_id=? AND ${ACTIVE}`,
    p.id,
  );
  const pending = p.manager
    ? await rows(
        c,
        "SELECT i.id,i.kind,i.expires_at,u.name,u.username FROM invitations i JOIN users u ON u.id=i.recipient_id WHERE i.pool_id=? AND i.status='pending' AND i.expires_at>?",
        p.id,
        now(),
      )
    : [];
  return c.json({
    ...p,
    thresholds: jsonParse(p.thresholds),
    members,
    invitations: pending,
  });
});
pools.put("/pools/:id", async (c) => {
  const p = await access(c, c.req.param("id"));
  if (p.membership === "temporary")
    fail(
      "Un intervenant ponctuel ne peut pas modifier le dossier permanent.",
      403,
    );
  const b = await c.req.json();
  const location =
    b.city_code && b.city_code !== p.city_code
      ? await place(str(b.city_code, 5, true))
      : null;
  const thresholdKeys = [
    "ph",
    "chlorine",
    "salt",
    "tac",
    "stabilizer",
    "bromine",
    "hardness",
  ];
  const th: Record<string, number[]> = {};
  for (const k of thresholdKeys) {
    const pair = b.thresholds?.[k];
    if (pair) {
      if (!Array.isArray(pair) || pair.length !== 2) fail("Repères invalides.");
      const min = number(pair[0], 0, k === "ph" ? 14 : 2000),
        max = number(pair[1], 0, k === "ph" ? 14 : 2000);
      if (min == null || max == null || min > max) fail("Repères invalides.");
      th[k] = [min, max];
    }
  }
  await c.env.DB.batch([
    stmt(
      c,
      "UPDATE pools SET name=?,kind=?,city_code=?,city=?,latitude=?,longitude=?,address=?,access_notes=?,volume=?,treatment=?,filtration=?,equipment=?,routine=?,client_advice=?,thresholds=?,winterized=? WHERE id=?",
      str(b.name, 80, true),
      choice(
        b.kind,
        [
          "private",
          "rental",
          "residence",
          "hotel",
          "camping",
          "public",
          "other",
        ] as const,
        p.kind,
      ),
      location?.code || p.city_code,
      location?.name || p.city,
      location?.lat ?? p.latitude,
      location?.lng ?? p.longitude,
      str(b.address, 300),
      str(b.access_notes, 1000),
      number(b.volume, 0.1, 100000),
      choice(
        b.treatment,
        ["unknown", "chlorine", "salt", "bromine", "oxygen", "other"] as const,
        "unknown",
      ),
      str(b.filtration, 200),
      str(b.equipment, 4000),
      str(b.routine, 2000),
      str(b.client_advice, 2000),
      JSON.stringify(th),
      b.winterized ? 1 : 0,
      p.id,
    ),
    audit(c, "pool.updated", p.id, p.id),
  ]);
  return c.json({ ok: true });
});
pools.post("/pools/:id/archive", async (c) => {
  const p = await access(c, c.req.param("id"), true);
  await c.env.DB.batch([
    stmt(c, "UPDATE pools SET archived_at=? WHERE id=?", now(), p.id),
    stmt(
      c,
      "UPDATE pool_members SET revoked_at=? WHERE pool_id=? AND revoked_at IS NULL",
      now(),
      p.id,
    ),
    stmt(c, "UPDATE schedules SET active=0 WHERE pool_id=?", p.id),
    stmt(
      c,
      "UPDATE invitations SET status='cancelled' WHERE pool_id=? AND status='pending'",
      p.id,
    ),
    audit(c, "pool.archived", p.id, p.id),
  ]);
  return c.json({ ok: true });
});
pools.post("/pools/:id/invitations", async (c) => {
  const p = await access(c, c.req.param("id"), true),
    b = await c.req.json();
  const kind = choice(b.kind, ["owner", "principal", "temporary"] as const);
  const target = await row<any>(
    c,
    "SELECT id,is_pro,name FROM users WHERE username=? AND disabled=0",
    str(b.username, 40, true).toLowerCase(),
  );
  if (!target)
    fail(
      "Ce compte est introuvable. Demande à cette personne de créer son compte.",
    );
  if (target.id === who(c).id) fail("Tu possèdes déjà un accès.");
  if (kind !== "owner" && !target.is_pro)
    fail("Ce compte doit activer son profil pisciniste.");
  const until = kind === "temporary" ? `${date(b.until)}T23:59:59.999Z` : null;
  if (
    until &&
    (until <= now() || Date.parse(until) > Date.now() + 90 * 86400000)
  )
    fail("Un accès ponctuel dure au maximum 90 jours.");
  const id = uid();
  await stmt(
    c,
    "UPDATE invitations SET status='cancelled' WHERE pool_id=? AND recipient_id=? AND status='pending' AND expires_at<=?",
    p.id,
    target.id,
    now(),
  ).run();
  await c.env.DB.batch([
    stmt(
      c,
      "INSERT INTO invitations(id,pool_id,sender_id,recipient_id,kind,access_until,expires_at) VALUES(?,?,?,?,?,?,?)",
      id,
      p.id,
      who(c).id,
      target.id,
      kind,
      until,
      new Date(Date.now() + 7 * 86400000).toISOString(),
    ),
    notify(
      c,
      target.id,
      "invitation",
      "Une invitation à rejoindre une piscine",
      `${who(c).name} te propose un accès.`,
      null,
    ),
    audit(c, "invitation.created", p.id, id),
  ]);
  return c.json({ id }, 201);
});
pools.get("/invitations", async (c) =>
  c.json({
    items: await rows(
      c,
      "SELECT i.id,i.kind,i.access_until,i.expires_at,p.name pool_name,u.name sender_name FROM invitations i JOIN pools p ON p.id=i.pool_id JOIN users u ON u.id=i.sender_id WHERE i.recipient_id=? AND i.status='pending' AND i.expires_at>? AND p.archived_at IS NULL ORDER BY i.created_at DESC",
      who(c).id,
      now(),
    ),
  }),
);
pools.post("/invitations/:id/respond", async (c) => {
  const b = await c.req.json(),
    status = choice(b.accept ? "accepted" : "declined", [
      "accepted",
      "declined",
    ] as const);
  const i = await row<any>(
    c,
    `SELECT i.* FROM invitations i JOIN pools p ON p.id=i.pool_id JOIN pool_members m ON m.pool_id=i.pool_id AND m.user_id=i.sender_id WHERE i.id=? AND i.recipient_id=? AND i.status='pending' AND i.expires_at>? AND m.manager=1 AND ${ACTIVE} AND p.archived_at IS NULL`,
    c.req.param("id"),
    who(c).id,
    now(),
  );
  if (!i) fail("Invitation expirée ou indisponible.", 404);
  if (status === "accepted" && i.kind !== "owner" && !who(c).is_pro)
    fail("Active ton profil pisciniste pour accepter.");
  if (i.access_until && i.access_until <= now())
    fail("La période d’intervention est terminée.");
  const ops = [
    stmt(
      c,
      "UPDATE pool_members SET revoked_at=? WHERE pool_id=? AND user_id=? AND revoked_at IS NULL AND expires_at<=?",
      now(),
      i.pool_id,
      who(c).id,
      now(),
    ),
    stmt(
      c,
      "UPDATE invitations SET status=? WHERE id=? AND recipient_id=? AND status='pending' AND expires_at>?",
      status,
      i.id,
      who(c).id,
      now(),
    ),
  ];
  if (status === "accepted")
    ops.push(
      stmt(
        c,
        "INSERT INTO pool_members(id,pool_id,user_id,kind,expires_at) SELECT ?,?,?,?,? WHERE changes()=1",
        uid(),
        i.pool_id,
        who(c).id,
        i.kind,
        i.access_until,
      ),
    );
  ops.push(
    notify(
      c,
      i.sender_id,
      "invitation",
      status === "accepted" ? "Invitation acceptée" : "Invitation refusée",
      who(c).name,
      i.pool_id,
    ),
    audit(c, `invitation.${status}`, i.pool_id, i.id),
  );
  await c.env.DB.batch(ops);
  return c.json({ ok: true });
});
pools.delete("/pools/:id/invitations/:inv", async (c) => {
  const p = await access(c, c.req.param("id"), true);
  await stmt(
    c,
    "UPDATE invitations SET status='cancelled' WHERE id=? AND pool_id=? AND status='pending'",
    c.req.param("inv"),
    p.id,
  ).run();
  return c.json({ ok: true });
});
pools.delete("/pools/:id/members/:member", async (c) => {
  const p = await access(c, c.req.param("id"));
  const m = await row<any>(
    c,
    "SELECT * FROM pool_members WHERE id=? AND pool_id=? AND revoked_at IS NULL",
    c.req.param("member"),
    p.id,
  );
  if (!m) fail("Accès introuvable.", 404);
  if (!p.manager && m.user_id !== who(c).id)
    fail("Action réservée au responsable.", 403);
  if (m.manager)
    fail("Transfère la responsabilité avant de quitter la piscine.");
  await c.env.DB.batch([
    stmt(c, "UPDATE pool_members SET revoked_at=? WHERE id=?", now(), m.id),
    stmt(
      c,
      "UPDATE schedules SET active=0 WHERE pool_id=? AND pro_id=?",
      p.id,
      m.user_id,
    ),
    stmt(
      c,
      "UPDATE invitations SET status='cancelled' WHERE pool_id=? AND sender_id=? AND status='pending'",
      p.id,
      m.user_id,
    ),
    notify(
      c,
      m.user_id,
      "access",
      "Un accès piscine a pris fin",
      "Tu ne peux plus consulter ce dossier.",
    ),
    audit(c, "access.revoked", p.id, m.id),
  ]);
  return c.json({ ok: true });
});
pools.post("/pools/:id/manager", async (c) => {
  const p = await access(c, c.req.param("id"), true),
    b = await c.req.json();
  const m = await row<any>(
    c,
    `SELECT m.* FROM pool_members m WHERE m.id=? AND m.pool_id=? AND m.kind='owner' AND ${ACTIVE}`,
    str(b.member_id, 36, true),
    p.id,
  );
  if (!m || m.manager) fail("Choisis un autre copropriétaire.");
  await c.env.DB.batch([
    stmt(
      c,
      "UPDATE pool_members SET manager=0 WHERE pool_id=? AND manager=1 AND user_id=?",
      p.id,
      who(c).id,
    ),
    stmt(
      c,
      "UPDATE pool_members SET manager=1 WHERE id=? AND changes()=1",
      m.id,
    ),
    stmt(
      c,
      "UPDATE invitations SET status='cancelled' WHERE pool_id=? AND status='pending'",
      p.id,
    ),
    notifyPool(c, p.id, "access", "Responsable de la piscine modifié"),
    audit(c, "manager.transferred", p.id, m.user_id),
  ]);
  return c.json({ ok: true });
});
pools.get("/pools/:id/notes", async (c) => {
  const p = await access(c, c.req.param("id"));
  if (p.membership === "owner")
    fail("Notes internes réservées au professionnel.", 403);
  return c.json({
    body:
      (
        await row<any>(
          c,
          "SELECT body FROM private_notes WHERE pool_id=? AND user_id=?",
          p.id,
          who(c).id,
        )
      )?.body || "",
  });
});
pools.put("/pools/:id/notes", async (c) => {
  const p = await access(c, c.req.param("id"));
  if (p.membership === "owner")
    fail("Notes internes réservées au professionnel.", 403);
  const b = await c.req.json();
  await stmt(
    c,
    "INSERT INTO private_notes(pool_id,user_id,body) VALUES(?,?,?) ON CONFLICT(pool_id,user_id) DO UPDATE SET body=excluded.body",
    p.id,
    who(c).id,
    str(b.body, 4000),
  ).run();
  return c.json({ ok: true });
});
pools.get("/pools/:id/export", async (c) => {
  const p = await access(c, c.req.param("id"));
  if (p.membership !== "owner")
    fail("Export réservé aux copropriétaires.", 403);
  const records = await rows(
    c,
    "SELECT id,author_name,kind,measured_at,readings,method,notes,products,checklist,published_at,correction_of FROM records WHERE pool_id=? AND published_at IS NOT NULL ORDER BY measured_at LIMIT 10001",
    p.id,
  );
  if (records.length > 10000)
    fail(
      "Ce dossier nécessite un export par période. Utilise l’historique paginé.",
      413,
    );
  c.header(
    "Content-Disposition",
    'attachment; filename="peaceinblue-dossier.json"',
  );
  return c.json({
    exported_at: now(),
    pool: {
      name: p.name,
      kind: p.kind,
      treatment: p.treatment,
      volume: p.volume,
      filtration: p.filtration,
      equipment: p.equipment,
    },
    records,
  });
});

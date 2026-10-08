import { Hono } from "hono";
import {
  Env,
  C,
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
  requirePro,
  ACTIVE,
  place,
  privateText,
  date,
  cursor,
  page,
  isAdmin,
} from "./core";
export const community = new Hono<Env>();
const fields = `h.id,h.author_is_pro,h.kind,h.title,h.body,h.specialty,h.scope,h.city,h.status,h.urgent,h.expires_at,h.created_at,CASE WHEN h.author_is_pro=1 THEN coalesce(nullif(u.company,''),u.name) ELSE 'Un propriétaire' END author_label`;
async function help(c: C, id: string) {
  const h = await row<any>(c, "SELECT * FROM help_requests WHERE id=?", id);
  if (!h) fail("Demande inaccessible.", 404);
  if (h.author_id !== who(c).id) {
    requirePro(c);
    if (h.hidden) fail("Demande inaccessible.", 404);
    const blocked = await row(
      c,
      "SELECT 1 FROM blocks WHERE (user_id=? AND blocked_id=?) OR (user_id=? AND blocked_id=?)",
      who(c).id,
      h.author_id,
      h.author_id,
      who(c).id,
    );
    if (blocked) fail("Demande inaccessible.", 404);
    const u = who(c);
    if (h.scope !== "national") {
      if (u.latitude == null || u.longitude == null)
        fail("Renseigne ta commune pour accéder aux demandes locales.", 404);
      const dy = (h.latitude - u.latitude) * 111.32,
        dx =
          (h.longitude - u.longitude) *
          111.32 *
          Math.max(0.1, Math.cos((u.latitude * Math.PI) / 180));
      if (Math.hypot(dx, dy) > u.radius_km)
        fail("Cette demande est en dehors de ton secteur.", 404);
    }
  }
  return h;
}
community.get("/help", async (c) => {
  const own = c.req.query("mine") === "1";
  if (!own) requirePro(c);
  const { limit, cursor: after } = cursor(c);
  const u = who(c),
    binds: any[] = [];
  let filter = own
    ? "h.author_id=?"
    : "h.hidden=0 AND h.status='open' AND h.expires_at>?";
  binds.push(own ? u.id : now());
  if (!own) {
    filter +=
      " AND NOT EXISTS(SELECT 1 FROM blocks b WHERE (b.user_id=? AND b.blocked_id=h.author_id) OR (b.user_id=h.author_id AND b.blocked_id=?))";
    binds.push(u.id, u.id);
    if (true) {
      if (u.latitude == null || u.longitude == null) {
        filter += " AND h.scope='national'";
      } else {
        const radius = u.radius_km,
          latRange = radius / 111.32,
          lngRange =
            radius /
            (111.32 * Math.max(0.1, Math.cos((u.latitude * Math.PI) / 180)));
        filter +=
          " AND (h.scope='national' OR (h.latitude BETWEEN ? AND ? AND h.longitude BETWEEN ? AND ? AND ((h.latitude-?)*(h.latitude-?)/(?*?)+(h.longitude-?)*(h.longitude-?)/(?*?))<=1))";
        binds.push(
          u.latitude - latRange,
          u.latitude + latRange,
          u.longitude - lngRange,
          u.longitude + lngRange,
          u.latitude,
          u.latitude,
          latRange,
          latRange,
          u.longitude,
          u.longitude,
          lngRange,
          lngRange,
        );
      }
    }
  }
  const specialty = str(c.req.query("specialty"), 30);
  if (specialty) {
    filter += " AND h.specialty=?";
    binds.push(specialty);
  }
  if (after) {
    const prev = await row<any>(
      c,
      "SELECT created_at FROM help_requests WHERE id=?",
      after,
    );
    if (prev) {
      filter += " AND (h.created_at<? OR(h.created_at=? AND h.id<?))";
      binds.push(prev.created_at, prev.created_at, after);
    }
  }
  binds.push(u.id, limit + 1);
  const list = await rows(
    c,
    `SELECT ${fields},(h.author_id=?) mine FROM help_requests h JOIN users u ON u.id=h.author_id WHERE ${filter} ORDER BY h.created_at DESC,h.id DESC LIMIT ?`,
    u.id,
    ...binds.slice(0, -2),
    limit + 1,
  );
  return c.json(page(list, limit));
});
community.post("/help", async (c) => {
  const b = await c.req.json(),
    u = who(c);
  const asPro = b.as_pro === true;
  if (asPro) requirePro(c);
  const kind = choice(
    b.kind,
    ["advice", "repair", "reinforcement", "replacement", "transfer"] as const,
    "advice",
  );
  const poolId = str(b.pool_id, 36);
  let p = null;
  if (poolId) p = await access(c, poolId);
  if (!asPro && (!p || p.membership !== "owner"))
    fail("Choisis une piscine dont tu es copropriétaire.");
  if (kind !== "advice" && !p)
    fail(
      "Relie cette mission à une piscine privée pour permettre son attribution.",
    );
  const location = await place(str(b.city_code || p?.city_code, 5, true));
  const scope =
    kind === "advice"
      ? choice(b.scope, ["local", "national"] as const, "local")
      : "local";
  const id = uid();
  await stmt(
    c,
    "INSERT INTO help_requests(id,author_id,author_is_pro,pool_id,kind,title,body,specialty,scope,city_code,city,latitude,longitude,urgent,expires_at) VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)",
    id,
    u.id,
    asPro ? 1 : 0,
    p?.id || null,
    kind,
    privateText(b.title, 120),
    privateText(b.body, 3000),
    choice(
      b.specialty,
      [
        "maintenance",
        "water",
        "filtration",
        "electricity",
        "leak",
        "renovation",
        "winter",
        "opening",
      ] as const,
      "maintenance",
    ),
    scope,
    location.code,
    location.name,
    location.lat,
    location.lng,
    b.urgent ? 1 : 0,
    new Date(Date.now() + 30 * 86400000).toISOString(),
  ).run();
  return c.json({ id }, 201);
});
community.get("/help/:id", async (c) => {
  const h = await help(c, c.req.param("id"));
  const safe = await row<any>(
    c,
    `SELECT ${fields} FROM help_requests h JOIN users u ON u.id=h.author_id WHERE h.id=?`,
    h.id,
  );
  const own = h.author_id === who(c).id;
  const replies = await rows(
    c,
    `SELECT r.id,r.body,r.created_at,(r.author_id=?) mine,CASE WHEN r.author_id=h.author_id AND h.author_is_pro=0 THEN 'Le demandeur' ELSE coalesce(nullif(u.company,''),u.name) END author_label FROM help_replies r JOIN users u ON u.id=r.author_id JOIN help_requests h ON h.id=r.request_id WHERE r.request_id=? AND NOT EXISTS(SELECT 1 FROM blocks b WHERE (b.user_id=? AND b.blocked_id=r.author_id) OR (b.user_id=r.author_id AND b.blocked_id=?)) ORDER BY r.created_at,r.id LIMIT 200`,
    who(c).id,
    h.id,
    who(c).id,
    who(c).id,
  );
  const offers = await rows(
    c,
    `SELECT o.id,o.message,o.until_date,o.status,u.name,u.company,(o.pro_id=?) mine FROM offers o JOIN users u ON u.id=o.pro_id WHERE o.request_id=? AND (?=1 OR o.pro_id=?) ORDER BY o.created_at`,
    who(c).id,
    h.id,
    own ? 1 : 0,
    who(c).id,
  );
  return c.json({ ...safe, mine: own, replies, offers });
});
community.post("/help/:id/replies", async (c) => {
  const h = await help(c, c.req.param("id"));
  if (h.status !== "open" || h.expires_at <= now())
    fail("Cette discussion est clôturée.");
  if (h.author_id !== who(c).id) requirePro(c);
  const b = await c.req.json(),
    id = uid();
  await c.env.DB.batch([
    stmt(
      c,
      "INSERT INTO help_replies(id,request_id,author_id,body) VALUES(?,?,?,?)",
      id,
      h.id,
      who(c).id,
      privateText(b.body, 2000),
    ),
    ...(h.author_id !== who(c).id
      ? [
          notify(
            c,
            h.author_id,
            "help",
            "Une réponse à votre demande",
            "Un professionnel a répondu.",
            null,
            h.id,
          ),
        ]
      : []),
  ]);
  return c.json({ id }, 201);
});
community.post("/help/:id/status", async (c) => {
  const h = await help(c, c.req.param("id"));
  if (h.author_id !== who(c).id) fail("Action réservée à l’auteur.", 403);
  const b = await c.req.json();
  if (h.status === "assigned")
    fail("Termine la mission depuis sa proposition avant de clôturer.");
  const status = choice(b.status, ["resolved", "closed"] as const);
  await c.env.DB.batch([
    stmt(c, "UPDATE help_requests SET status=? WHERE id=?", status, h.id),
    stmt(
      c,
      "UPDATE offers SET status='cancelled' WHERE request_id=? AND status IN('pending','awaiting_owner')",
      h.id,
    ),
  ]);
  return c.json({ ok: true });
});
community.post("/help/:id/offers", async (c) => {
  requirePro(c);
  const h = await help(c, c.req.param("id"));
  if (
    h.author_id === who(c).id ||
    h.status !== "open" ||
    h.expires_at <= now() ||
    h.kind === "advice" ||
    !h.pool_id
  )
    fail("Cette demande ne permet pas de proposer une intervention.");
  const b = await c.req.json(),
    until = date(b.until_date);
  if (
    until < now().slice(0, 10) ||
    Date.parse(until) > Date.now() + 90 * 86400000
  )
    fail("Choisis une échéance dans les 90 prochains jours.");
  const id = uid();
  await c.env.DB.batch([
    stmt(
      c,
      "INSERT INTO offers(id,request_id,pro_id,message,until_date) VALUES(?,?,?,?,?)",
      id,
      h.id,
      who(c).id,
      privateText(b.message, 1000),
      until,
    ),
    notify(
      c,
      h.author_id,
      "offer",
      "Un professionnel propose d’intervenir",
      "Consulte sa proposition dans la plateforme.",
      null,
      h.id,
    ),
  ]);
  return c.json({ id }, 201);
});
community.post("/offers/:id/select", async (c) => {
  const offer = await row<any>(
    c,
    "SELECT o.*,h.author_id,h.pool_id,h.kind,h.status request_status FROM offers o JOIN help_requests h ON h.id=o.request_id WHERE o.id=?",
    c.req.param("id"),
  );
  if (!offer || offer.author_id !== who(c).id)
    fail("Proposition inaccessible.", 404);
  if (offer.status !== "pending" || offer.request_status !== "open")
    fail("Cette proposition a déjà été traitée.", 409);
  await access(c, offer.pool_id);
  const manager = await row<any>(
    c,
    `SELECT m.user_id FROM pool_members m WHERE m.pool_id=? AND m.manager=1 AND ${ACTIVE}`,
    offer.pool_id,
  );
  if (!manager) fail("Responsable de piscine indisponible.");
  await c.env.DB.batch([
    stmt(
      c,
      "UPDATE offers SET status='awaiting_owner' WHERE id=? AND status='pending'",
      offer.id,
    ),
    notify(
      c,
      manager.user_id,
      "mission",
      "Votre accord est nécessaire pour une intervention",
      "Une proposition attend votre autorisation dans les accès de votre piscine.",
      offer.pool_id,
    ),
    notify(
      c,
      offer.pro_id,
      "offer",
      "Votre proposition a été retenue",
      "L’autorisation du responsable de la piscine est en attente.",
      null,
      offer.request_id,
    ),
  ]);
  return c.json({ ok: true, requires_owner_approval: true });
});
community.get("/pools/:id/approvals", async (c) => {
  const p = await access(c, c.req.param("id"), true);
  return c.json({
    items: await rows(
      c,
      "SELECT o.id,o.until_date,o.status,u.name,u.company,h.kind FROM offers o JOIN help_requests h ON h.id=o.request_id JOIN users u ON u.id=o.pro_id WHERE h.pool_id=? AND o.status IN('awaiting_owner','accepted') ORDER BY o.created_at",
      p.id,
    ),
  });
});
community.post("/offers/:id/approve", async (c) => {
  const o = await row<any>(
    c,
    "SELECT o.*,h.pool_id,h.kind,h.author_id,h.status request_status FROM offers o JOIN help_requests h ON h.id=o.request_id WHERE o.id=?",
    c.req.param("id"),
  );
  if (!o) fail("Proposition inaccessible.", 404);
  await access(c, o.pool_id, true);
  const b = await c.req.json();
  if (o.status !== "awaiting_owner" || o.request_status !== "open")
    fail("Cette demande a déjà été traitée.", 409);
  if (!b.accept) {
    await c.env.DB.batch([
      stmt(
        c,
        "UPDATE offers SET status='declined' WHERE id=? AND status='awaiting_owner'",
        o.id,
      ),
      notify(
        c,
        o.pro_id,
        "offer",
        "L’intervention n’a pas été autorisée",
        "",
        null,
        o.request_id,
      ),
    ]);
    return c.json({ ok: true });
  }
  if (o.until_date < now().slice(0, 10))
    fail("La période proposée est terminée.");
  const target = await row(
    c,
    "SELECT id FROM users WHERE id=? AND is_pro=1 AND disabled=0",
    o.pro_id,
  );
  if (!target) fail("Professionnel indisponible.");
  const member = await row(
    c,
    `SELECT m.id FROM pool_members m WHERE m.pool_id=? AND m.user_id=? AND ${ACTIVE}`,
    o.pool_id,
    o.pro_id,
  );
  if (member) fail("Ce professionnel a déjà accès à cette piscine.");
  const at = now(),
    ops = [];
  if (o.kind === "transfer") {
    ops.push(
      stmt(
        c,
        "UPDATE schedules SET active=0 WHERE pool_id=? AND pro_id IN(SELECT user_id FROM pool_members WHERE pool_id=? AND kind='principal' AND revoked_at IS NULL)",
        o.pool_id,
        o.pool_id,
      ),
      stmt(
        c,
        "UPDATE pool_members SET revoked_at=? WHERE pool_id=? AND kind='principal' AND revoked_at IS NULL",
        at,
        o.pool_id,
      ),
    );
  }
  ops.push(
    stmt(
      c,
      "UPDATE pool_members SET revoked_at=? WHERE pool_id=? AND user_id=? AND revoked_at IS NULL AND expires_at<=?",
      at,
      o.pool_id,
      o.pro_id,
      at,
    ),
    stmt(
      c,
      "UPDATE offers SET status='accepted' WHERE id=? AND status='awaiting_owner'",
      o.id,
    ),
    stmt(
      c,
      "INSERT INTO pool_members(id,pool_id,user_id,kind,expires_at) SELECT ?,?,?,?,? WHERE changes()=1",
      uid(),
      o.pool_id,
      o.pro_id,
      o.kind === "transfer" ? "principal" : "temporary",
      o.kind === "transfer" ? null : o.until_date + "T23:59:59.999Z",
    ),
    stmt(
      c,
      "UPDATE help_requests SET status='assigned' WHERE id=?",
      o.request_id,
    ),
    stmt(
      c,
      "UPDATE offers SET status='declined' WHERE request_id=? AND id!=? AND status='pending'",
      o.request_id,
      o.id,
    ),
    notify(
      c,
      o.pro_id,
      "access",
      "Vous pouvez maintenant préparer votre intervention",
      "Le dossier piscine est accessible pour la période autorisée.",
      o.pool_id,
    ),
    notifyPool(
      c,
      o.pool_id,
      "access",
      o.kind === "transfer"
        ? "Le pisciniste principal a changé"
        : "Une intervention ponctuelle a été autorisée",
      "",
      true,
    ),
    audit(c, "mission.approved", o.pool_id, o.id),
  );
  await c.env.DB.batch(ops);
  return c.json({ ok: true });
});
community.post("/offers/:id/finish", async (c) => {
  const o = await row<any>(
    c,
    "SELECT o.*,h.pool_id,h.kind,h.author_id FROM offers o JOIN help_requests h ON h.id=o.request_id WHERE o.id=?",
    c.req.param("id"),
  );
  if (!o) fail("Proposition inaccessible.", 404);
  const p = await access(c, o.pool_id);
  if (o.pro_id !== who(c).id && !p.manager)
    fail("Action réservée à l’intervenant ou au responsable.", 403);
  if (o.status !== "accepted") fail("Cette mission n’est pas active.");
  await c.env.DB.batch([
    stmt(
      c,
      "UPDATE offers SET status='finished' WHERE id=? AND status='accepted'",
      o.id,
    ),
    ...(o.kind !== "transfer"
      ? [
          stmt(
            c,
            "UPDATE pool_members SET revoked_at=? WHERE pool_id=? AND user_id=? AND kind='temporary' AND revoked_at IS NULL",
            now(),
            o.pool_id,
            o.pro_id,
          ),
        ]
      : []),
    stmt(
      c,
      "UPDATE help_requests SET status='resolved' WHERE id=?",
      o.request_id,
    ),
    notify(
      c,
      o.author_id,
      "mission",
      "La mission est terminée",
      "",
      null,
      o.request_id,
    ),
    audit(c, "mission.finished", o.pool_id, o.id),
  ]);
  return c.json({ ok: true });
});
community.post("/help/:id/flag", async (c) => {
  const h = await help(c, c.req.param("id")),
    b = await c.req.json();
  await stmt(
    c,
    "INSERT OR IGNORE INTO flags(id,user_id,request_id,reason) VALUES(?,?,?,?)",
    uid(),
    who(c).id,
    h.id,
    str(b.reason, 1000, true),
  ).run();
  return c.json({ ok: true });
});
community.post("/help/:id/block", async (c) => {
  const h = await help(c, c.req.param("id"));
  if (h.author_id === who(c).id) fail("Tu ne peux pas te bloquer.");
  await stmt(
    c,
    "INSERT OR IGNORE INTO blocks(user_id,blocked_id) VALUES(?,?)",
    who(c).id,
    h.author_id,
  ).run();
  return c.json({ ok: true });
});
community.get("/admin/flags", async (c) => {
  if (!isAdmin(c)) fail("Accès réservé.", 403);
  return c.json({
    items: await rows(
      c,
      "SELECT f.id,f.reason,f.created_at,h.id request_id,h.title,h.body FROM flags f JOIN help_requests h ON h.id=f.request_id WHERE f.status='open' ORDER BY f.created_at LIMIT 100",
    ),
  });
});
community.post("/admin/flags/:id", async (c) => {
  if (!isAdmin(c)) fail("Accès réservé.", 403);
  const f = await row<any>(
    c,
    "SELECT * FROM flags WHERE id=?",
    c.req.param("id"),
  );
  if (!f) fail("Signalement introuvable.", 404);
  const b = await c.req.json();
  await c.env.DB.batch([
    stmt(c, "UPDATE flags SET status='reviewed' WHERE id=?", f.id),
    ...(b.hide
      ? [stmt(c, "UPDATE help_requests SET hidden=1 WHERE id=?", f.request_id)]
      : []),
    audit(c, "moderation.reviewed", null, f.id),
  ]);
  return c.json({ ok: true });
});

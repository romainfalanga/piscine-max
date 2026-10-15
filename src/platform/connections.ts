import { Hono } from "hono";
import {
  Env,
  ACTIVE,
  who,
  requirePro,
  str,
  uid,
  now,
  fail,
  row,
  rows,
  stmt,
  access,
  notify,
} from "./core";
export const connections = new Hono<Env>();
connections.get("/connections", async (c) => {
  const u = who(c).id;
  return c.json({
    incoming: await rows(
      c,
      "SELECT r.id,r.expires_at,u.name,u.company,u.username FROM connection_requests r JOIN users u ON u.id=r.pro_id WHERE r.client_id=? AND r.status='pending' AND r.expires_at>? AND u.disabled=0 AND u.is_pro=1 ORDER BY r.created_at DESC LIMIT 100",
      u,
      now(),
    ),
    outgoing: await rows(
      c,
      "SELECT r.id,r.expires_at,u.name,u.username FROM connection_requests r JOIN users u ON u.id=r.client_id WHERE r.pro_id=? AND r.status='pending' AND r.expires_at>? ORDER BY r.created_at DESC LIMIT 100",
      u,
      now(),
    ),
  });
});
connections.post("/connections", async (c) => {
  requirePro(c);
  const b = await c.req.json(),
    target = await row(
      c,
      "SELECT id FROM users WHERE username=? AND disabled=0",
      str(b.username, 40, true).toLowerCase(),
    );
  if (!target)
    fail(
      "Compte introuvable. Demandez au client de s’inscrire et de vous transmettre son identifiant.",
    );
  if (target.id === who(c).id) fail("Choisissez le compte de votre client.");
  await stmt(
    c,
    "UPDATE connection_requests SET status='cancelled' WHERE pro_id=? AND client_id=? AND status='pending' AND expires_at<=?",
    who(c).id,
    target.id,
    now(),
  ).run();
  const id = uid();
  await c.env.DB.batch([
    stmt(
      c,
      "INSERT INTO connection_requests(id,pro_id,client_id,expires_at) VALUES(?,?,?,?)",
      id,
      who(c).id,
      target.id,
      new Date(Date.now() + 7 * 86400000).toISOString(),
    ),
    notify(
      c,
      target.id,
      "invitation",
      "Votre pisciniste souhaite vous rejoindre",
      `${who(c).name} vous demande de choisir la piscine à lui confier.`,
    ),
  ]);
  return c.json({ id }, 201);
});
connections.delete("/connections/:id", async (c) => {
  const r = await stmt(
    c,
    "UPDATE connection_requests SET status='cancelled' WHERE id=? AND pro_id=? AND status='pending'",
    c.req.param("id"),
    who(c).id,
  ).run();
  if (!r.meta.changes) fail("Demande indisponible.", 404);
  return c.json({ ok: true });
});
connections.post("/connections/:id/respond", async (c) => {
  const b = await c.req.json();
  if (typeof b.accept !== "boolean") fail("Réponse invalide.");
  const r = await row(
    c,
    "SELECT r.* FROM connection_requests r JOIN users u ON u.id=r.pro_id WHERE r.id=? AND r.client_id=? AND r.status='pending' AND r.expires_at>? AND u.is_pro=1 AND u.disabled=0",
    c.req.param("id"),
    who(c).id,
    now(),
  );
  if (!r) fail("Demande expirée ou indisponible.", 404);
  const poolId = b.accept ? str(b.pool_id, 80, true) : null;
  if (poolId) {
    const p = await access(c, poolId, true);
    if (p.membership !== "owner" || !p.manager)
      fail("Seul le client responsable peut choisir le pisciniste.", 403);
    if (
      await row(
        c,
        "SELECT id FROM pool_members WHERE pool_id=? AND kind='principal' AND revoked_at IS NULL",
        poolId,
      )
    )
      fail(
        "Cette piscine a déjà un pisciniste. Retirez son accès avant d’en choisir un autre.",
        409,
      );
  }
  const nonce = uid();
  let sql =
    "UPDATE connection_requests SET status=?,resolution_nonce=? WHERE id=? AND client_id=? AND status='pending' AND expires_at>? AND EXISTS(SELECT 1 FROM users u WHERE u.id=connection_requests.pro_id AND u.is_pro=1 AND u.disabled=0)";
  const args: any[] = [
    b.accept ? "accepted" : "declined",
    nonce,
    r.id,
    who(c).id,
    now(),
  ];
  if (poolId) {
    sql += ` AND EXISTS(SELECT 1 FROM pools p JOIN pool_members m ON m.pool_id=p.id WHERE p.id=? AND m.user_id=? AND m.manager=1 AND m.kind='owner' AND ${ACTIVE} AND p.archived_at IS NULL) AND NOT EXISTS(SELECT 1 FROM pool_members WHERE pool_id=? AND kind='principal' AND revoked_at IS NULL)`;
    args.push(poolId, who(c).id, poolId);
  }
  const gate = `EXISTS(SELECT 1 FROM connection_requests WHERE id=? AND resolution_nonce=?)`,
    ops = [stmt(c, sql, ...args)];
  if (poolId)
    ops.push(
      stmt(
        c,
        `INSERT INTO pool_members(id,pool_id,user_id,kind) SELECT ?,?,?,'principal' WHERE ${gate}`,
        uid(),
        poolId,
        r.pro_id,
        r.id,
        nonce,
      ),
    );
  ops.push(
    stmt(
      c,
      `INSERT INTO notifications(id,user_id,type,title,body,pool_id) SELECT ?,?,'invitation',?,?,? WHERE ${gate}`,
      uid(),
      r.pro_id,
      b.accept ? "Piscine ajoutée à votre suivi" : "Demande refusée",
      who(c).name,
      poolId,
      r.id,
      nonce,
    ),
  );
  ops.push(
    stmt(
      c,
      `INSERT INTO audit(id,actor_id,pool_id,action,target_id) SELECT ?,?,?,?,? WHERE ${gate}`,
      uid(),
      who(c).id,
      poolId,
      b.accept ? "connection.accepted" : "connection.declined",
      r.id,
      r.id,
      nonce,
    ),
  );
  const done = await c.env.DB.batch(ops);
  if (!done[0].meta.changes)
    fail("La demande ou les accès ont changé. Actualisez votre espace.", 409);
  return c.json({ ok: true, pool_id: poolId });
});

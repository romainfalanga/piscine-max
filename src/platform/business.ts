import { Hono } from "hono";
import {
  Env,
  C,
  ACTIVE,
  access,
  who,
  requirePro,
  row,
  rows,
  stmt,
  fail,
  str,
  uid,
  limit,
  cursor,
} from "./core";
export const business = new Hono<Env>();
const liveRequest = `EXISTS(SELECT 1 FROM pools p JOIN pool_members m ON m.pool_id=p.id WHERE p.id=r.pool_id AND p.archived_at IS NULL AND m.user_id=r.requester_id AND m.kind='owner' AND m.manager=1 AND ${ACTIVE})`;
async function provider(c: C) {
  const u = await row(
    c,
    "SELECT u.id FROM business_provider b JOIN users u ON u.id=b.user_id WHERE u.disabled=0 AND u.is_pro=1",
  );
  if (!u)
    fail("Les demandes d’entretien sont momentanément indisponibles.", 503);
  return u.id as string;
}
business.get("/pools/:id/intervenant", async (c) => {
  const p = await access(c, c.req.param("id"));
  const request = await row(
    c,
    `SELECT r.id,r.status,r.created_at,CASE WHEN ?=1 THEN r.phone ELSE NULL END phone FROM maintenance_requests r WHERE r.pool_id=? AND ${liveRequest} ORDER BY r.created_at DESC,r.id DESC LIMIT 1`,
    p.manager,
    p.id,
  );
  return c.json({ request });
});
business.post("/pools/:id/intervenant", async (c) => {
  const p = await access(c, c.req.param("id"), true);
  if (p.membership !== "owner" || !p.manager)
    fail("Seul le responsable peut demander un entretien.", 403);
  const providerId = await provider(c);
  if (who(c).id === providerId) fail("Cette demande est réservée aux clients.");
  if (
    await row(
      c,
      "SELECT id FROM pool_members WHERE pool_id=? AND kind='principal' AND revoked_at IS NULL",
      p.id,
    )
  )
    fail("Cette piscine est déjà suivie par Peace in Blue.", 409);
  const b = await c.req.json();
  let phone = str(b.phone, 35, true).replace(/[\s().-]/g, "");
  if (/^0[67]\d{8}$/.test(phone)) phone = "+33" + phone.slice(1);
  if (
    !/^\+[1-9]\d{7,14}$/.test(phone) ||
    (/^\+33/.test(phone) && !/^\+33[67]\d{8}$/.test(phone))
  )
    fail(
      "Renseignez un numéro de téléphone portable valide, avec indicatif pour un numéro étranger.",
    );
  await limit(c, `maintenance-request:${who(c).id}`, 10, 3600);
  const id = uid();
  const created = await c.env.DB.batch([
    stmt(
      c,
      `UPDATE maintenance_requests AS r SET status='cancelled',resolved_at=strftime('%Y-%m-%dT%H:%M:%fZ','now') WHERE r.pool_id=? AND r.status='pending' AND NOT (${liveRequest})`,
      p.id,
    ),
    stmt(
      c,
      `INSERT INTO maintenance_requests(id,pool_id,requester_id,phone) SELECT ?,?,?,? WHERE EXISTS(SELECT 1 FROM pools p JOIN pool_members m ON m.pool_id=p.id WHERE p.id=? AND m.user_id=? AND m.kind='owner' AND m.manager=1 AND ${ACTIVE} AND p.archived_at IS NULL) AND NOT EXISTS(SELECT 1 FROM pool_members WHERE pool_id=? AND kind='principal' AND revoked_at IS NULL)`,
      id,
      p.id,
      who(c).id,
      phone,
      p.id,
      who(c).id,
      p.id,
    ),
    // A request does not yet grant access to the private pool dossier.
    stmt(
      c,
      "INSERT INTO notifications(id,user_id,type,title,body,maintenance_request_id) SELECT ?,?,'maintenance-request','Demande d’entretien régulier','Une nouvelle demande vous attend dans le tableau de bord.',? WHERE EXISTS(SELECT 1 FROM maintenance_requests WHERE id=?)",
      uid(),
      providerId,
      id,
      id,
    ),
  ]);
  if (!created[1].meta.changes)
    fail("Les accès à la piscine ont changé. Actualisez votre espace.", 409);
  return c.json({ id }, 201);
});
business.delete("/pools/:id/intervenant/:request", async (c) => {
  const p = await access(c, c.req.param("id"), true);
  if (p.membership !== "owner" || !p.manager)
    fail("Seul le responsable peut annuler la demande.", 403);
  const done = await stmt(
    c,
    "UPDATE maintenance_requests SET status='cancelled',resolved_at=strftime('%Y-%m-%dT%H:%M:%fZ','now') WHERE id=? AND pool_id=? AND status='pending'",
    c.req.param("request"),
    p.id,
  ).run();
  if (!done.meta.changes) fail("Cette demande n’est plus en attente.", 409);
  return c.json({ ok: true });
});
business.get("/business-summary", async (c) => {
  requirePro(c);
  const counts = await row(
    c,
    `SELECT
    (SELECT count(*) FROM users WHERE disabled=0 AND id NOT IN(SELECT user_id FROM business_provider WHERE user_id IS NOT NULL)) platform_accounts,
    (SELECT count(DISTINCT m.user_id) FROM pool_members m JOIN pools p ON p.id=m.pool_id JOIN users u ON u.id=m.user_id WHERE m.kind='owner' AND ${ACTIVE} AND p.archived_at IS NULL AND u.disabled=0 AND u.is_pro=0) pool_owners,
    (SELECT count(DISTINCT m.user_id) FROM pool_members m JOIN pools p ON p.id=m.pool_id JOIN users u ON u.id=m.user_id WHERE m.kind='owner' AND ${ACTIVE} AND p.archived_at IS NULL AND u.disabled=0 AND u.is_pro=0 AND EXISTS(SELECT 1 FROM pool_members pm WHERE pm.pool_id=p.id AND pm.user_id=? AND pm.kind='principal' AND pm.revoked_at IS NULL)) maintenance_clients,
    (SELECT count(*) FROM pools p WHERE p.archived_at IS NULL AND EXISTS(SELECT 1 FROM pool_members pm WHERE pm.pool_id=p.id AND pm.user_id=? AND pm.kind='principal' AND pm.revoked_at IS NULL)) followed_pools,
    (SELECT count(*) FROM maintenance_requests r WHERE r.status='pending' AND ${liveRequest}) pending_requests`,
    who(c).id,
    who(c).id,
  );
  const { limit: size, cursor: after } = cursor(c);
  const parts = after.split("|");
  if (
    after &&
    (parts.length !== 2 ||
      !/^\d{4}-\d{2}-\d{2}T/.test(parts[0]) ||
      !/^[a-f0-9-]{36}$/.test(parts[1]))
  )
    fail("Page de demandes invalide.");
  const requests = await rows(
    c,
    `SELECT r.id,r.phone,r.created_at,p.name pool_name,p.city,u.login_email email FROM maintenance_requests r JOIN pools p ON p.id=r.pool_id JOIN users u ON u.id=r.requester_id WHERE r.status='pending' AND ${liveRequest} ${after ? "AND (r.created_at,r.id)<(?,?)" : ""} ORDER BY r.created_at DESC,r.id DESC LIMIT ?`,
    ...(after ? parts : []),
    size + 1,
  );
  return c.json({
    ...counts,
    requests: {
      items: requests.slice(0, size),
      next:
        requests.length > size
          ? requests[size - 1].created_at + "|" + requests[size - 1].id
          : null,
    },
  });
});
business.post("/maintenance-requests/:id/respond", async (c) => {
  requirePro(c);
  const b = await c.req.json();
  if (typeof b.accept !== "boolean") fail("Réponse invalide.");
  const r = await row(
    c,
    `SELECT r.* FROM maintenance_requests r WHERE r.id=? AND r.status='pending' AND ${liveRequest}`,
    c.req.param("id"),
  );
  if (!r) fail("Demande indisponible ou annulée.", 404);
  const nonce = uid();
  const gate =
    "EXISTS(SELECT 1 FROM maintenance_requests WHERE id=? AND resolution_nonce=?)";
  const ops = [
    stmt(
      c,
      `UPDATE maintenance_requests AS r SET status=?,resolution_nonce=?,resolved_at=strftime('%Y-%m-%dT%H:%M:%fZ','now') WHERE r.id=? AND r.status='pending' AND ${liveRequest} AND NOT EXISTS(SELECT 1 FROM pool_members pm WHERE pm.pool_id=r.pool_id AND pm.kind='principal' AND pm.revoked_at IS NULL)`,
      b.accept ? "accepted" : "declined",
      nonce,
      r.id,
    ),
  ];
  if (b.accept)
    ops.push(
      stmt(
        c,
        `INSERT INTO pool_members(id,pool_id,user_id,kind) SELECT ?,?,?,'principal' WHERE ${gate}`,
        uid(),
        r.pool_id,
        who(c).id,
        r.id,
        nonce,
      ),
    );
  ops.push(
    stmt(
      c,
      `INSERT INTO notifications(id,user_id,type,title,body,pool_id) SELECT ?,?,'maintenance-response',?,?,? WHERE ${gate}`,
      uid(),
      r.requester_id,
      b.accept
        ? "Votre entretien régulier avec Peace in Blue"
        : "Votre demande d’entretien",
      b.accept
        ? "Peace in Blue prend en charge votre piscine. Les dates de passage seront convenues avec vous."
        : "Peace in Blue ne peut pas donner suite à cette demande pour le moment.",
      r.pool_id,
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
      r.pool_id,
      b.accept ? "maintenance.accepted" : "maintenance.declined",
      r.id,
      r.id,
      nonce,
    ),
  );
  const done = await c.env.DB.batch(ops);
  if (!done[0].meta.changes)
    fail(
      "La demande ou les accès ont changé. Actualisez votre tableau de bord.",
      409,
    );
  return c.json({ ok: true, pool_id: b.accept ? r.pool_id : null });
});

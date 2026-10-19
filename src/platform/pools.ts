import { maintenanceTasks } from "./maintenance";
import { locationBody } from "./locations";
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
  MANAGES,
  CLAIMABLE,
  requirePro,
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
  let q = `SELECT p.id,p.name,p.kind,p.city,p.city_code,p.address,p.latitude,p.longitude,p.location_precision,p.treatment,p.volume,p.winterized,(SELECT user_id FROM pool_members WHERE pool_id=p.id AND kind='principal' AND revoked_at IS NULL) principal_id,m.kind membership,m.manager,(SELECT json_group_array(json_object('id',u.id,'name',u.name,'username',u.username)) FROM pool_members o JOIN users u ON u.id=o.user_id WHERE o.pool_id=p.id AND o.kind='owner' AND o.revoked_at IS NULL AND (o.expires_at IS NULL OR o.expires_at>strftime('%Y-%m-%dT%H:%M:%fZ','now'))) owners_json,(SELECT max(r.measured_at) FROM records r WHERE r.pool_id=p.id AND r.published_at IS NOT NULL) last_reading FROM pools p JOIN pool_members m ON m.pool_id=p.id WHERE m.user_id=? AND ${ACTIVE} AND p.archived_at IS NULL AND ${mode === "client" ? "m.kind='owner'" : "m.kind='principal'"}`;
  const binds: any[] = [who(c).id];
  if (after) {
    q += " AND p.id>?";
    binds.push(after);
  }
  const search = str(c.req.query("q"), 100);
  if (search) {
    q +=
      " AND (p.name LIKE ? OR p.city LIKE ? OR EXISTS(SELECT 1 FROM pool_members o JOIN users u ON u.id=o.user_id WHERE o.pool_id=p.id AND o.kind='owner' AND o.revoked_at IS NULL AND (o.expires_at IS NULL OR o.expires_at>strftime('%Y-%m-%dT%H:%M:%fZ','now')) AND (u.name LIKE ? OR u.username LIKE ?)))";
    binds.push(...Array(4).fill(`%${search.replace(/[%_]/g, "")}%`));
  }
  q += " ORDER BY p.id LIMIT ?";
  binds.push(limit + 1);
  const result = page(await rows(c, q, ...binds), limit);
  result.items = result.items.map(({ owners_json, ...p }: any) => ({
    ...p,
    owners: jsonParse(owners_json, []),
  }));
  return c.json(result);
});
pools.post("/pools", async (c) => {
  const b = await c.req.json(),
    u = who(c),
    id = uid();
  const mode = choice(b.mode, ["client", "pro"] as const, "client");
  if (mode === "pro") requirePro(c);
  const clientUsername = mode === "pro" ? str(b.client_username, 40) : "";
  const client = clientUsername
    ? await row(
        c,
        "SELECT id FROM users WHERE username=? AND disabled=0",
        clientUsername.toLowerCase(),
      )
    : null;
  if (clientUsername && !client)
    fail(
      "Client introuvable. Vérifiez son identifiant ou invitez-le après son inscription.",
    );
  if (client?.id === u.id)
    fail("Utilisez votre espace client pour votre piscine personnelle.");
  const legacy =
    !b.location && b.city_code ? await place(str(b.city_code, 5, true)) : null;
  const loc = locationBody(b);
  if (legacy)
    Object.assign(loc, {
      code: legacy.code,
      city: legacy.name,
      lat: legacy.lat,
      lng: legacy.lng,
      precision: "municipality",
    });
  const ops = [
    stmt(
      c,
      "INSERT INTO pools(id,name,kind,city_code,city,latitude,longitude,address,volume,treatment,created_by,location_precision) VALUES(?,?,?,?,?,?,?,?,?,?,?,?)",
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
      loc.code,
      loc.city,
      loc.lat,
      loc.lng,
      loc.address,
      number(b.volume, 0.1, 100000),
      choice(
        b.treatment,
        ["unknown", "chlorine", "salt", "bromine", "oxygen", "other"] as const,
        "unknown",
      ),
      u.id,
      loc.precision,
    ),
    stmt(
      c,
      "INSERT INTO pool_members(id,pool_id,user_id,kind,manager) VALUES(?,?,?,?,?)",
      uid(),
      id,
      u.id,
      mode === "pro" ? "principal" : "owner",
      mode === "pro" ? 0 : 1,
    ),
    audit(c, "pool.created", id, id),
  ];
  if (client)
    ops.push(
      stmt(
        c,
        "INSERT INTO invitations(id,pool_id,sender_id,recipient_id,kind,expires_at) VALUES(?,?,?,?,'owner',?)",
        uid(),
        id,
        u.id,
        client.id,
        new Date(Date.now() + 7 * 86400000).toISOString(),
      ),
      notify(
        c,
        client.id,
        "invitation",
        "Votre pisciniste a préparé votre piscine",
        `${u.name} vous invite. Acceptez depuis votre espace.`,
      ),
    );
  await c.env.DB.batch(ops);
  return c.json({ id }, 201);
});
pools.get("/pools/:id", async (c) => {
  const p = await access(c, c.req.param("id"));
  const members = await rows(
    c,
    `SELECT m.id,m.user_id,m.kind,m.manager,m.expires_at,u.name,u.company,u.username FROM pool_members m JOIN users u ON u.id=m.user_id WHERE m.pool_id=? AND ${ACTIVE}`,
    p.id,
  );
  const pending =
    p.manager || p.claimable
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
    routine: p.membership === "principal" ? p.routine : undefined,
    maintenance_tasks:
      p.membership === "principal" ? maintenanceTasks(p) : undefined,
    members,
    invitations: pending,
  });
});
pools.put("/pools/:id", async (c) => {
  const p = await access(c, c.req.param("id"));
  const b = await c.req.json();
  const professional = p.membership === "principal";
  if (
    !professional &&
    (b.routine !== undefined || b.client_advice !== undefined)
  )
    fail(
      "Les consignes d’entretien et conseils sont renseignés par votre pisciniste.",
      403,
    );
  const loc = locationBody(b, p);
  if (!b.location && b.city_code && b.city_code !== p.city_code) {
    const v = await place(str(b.city_code, 5, true));
    Object.assign(loc, {
      code: v.code,
      city: v.name,
      lat: v.lat,
      lng: v.lng,
      precision: "municipality",
    });
  }
  const thresholdKeys = ["ph", "chlorine"];
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
      "UPDATE pools SET name=?,kind=?,city_code=?,city=?,latitude=?,longitude=?,address=?,access_notes=?,volume=?,treatment=?,filtration=?,equipment=?,routine=?,client_advice=?,thresholds=?,winterized=?,location_precision=?,filter_type=?,has_steps=?,has_skimmers=?,has_prefilter=? WHERE id=?",
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
      loc.code,
      loc.city,
      loc.lat,
      loc.lng,
      loc.address,
      str(b.access_notes, 1000),
      number(b.volume, 0.1, 100000),
      choice(
        b.treatment,
        ["unknown", "chlorine", "salt", "bromine", "oxygen", "other"] as const,
        "unknown",
      ),
      str(b.filtration, 200),
      str(b.equipment, 4000),
      professional && b.routine !== undefined
        ? str(b.routine, 2000)
        : p.routine,
      professional && b.client_advice !== undefined
        ? str(b.client_advice, 2000)
        : p.client_advice,
      JSON.stringify(th),
      b.winterized ? 1 : 0,
      loc.precision,
      choice(
        b.filter_type,
        ["unknown", "sand", "glass", "cartridge", "other"] as const,
        p.filter_type,
      ),
      b.has_steps === undefined ? p.has_steps : b.has_steps === true ? 1 : 0,
      b.has_skimmers === undefined
        ? p.has_skimmers
        : b.has_skimmers === true
          ? 1
          : 0,
      b.has_prefilter === undefined
        ? p.has_prefilter
        : b.has_prefilter === true
          ? 1
          : 0,
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
  const kind = choice(b.kind, ["owner", "principal"] as const);
  if (p.claimable && kind !== "owner")
    fail("Invitez le client : vous êtes déjà le pisciniste principal.");
  const target = await row(
    c,
    "SELECT id,is_pro,name FROM users WHERE username=? AND disabled=0",
    str(b.username, 40, true).toLowerCase(),
  );
  if (!target)
    fail("Compte introuvable. Cette personne doit d’abord s’inscrire.");
  if (target.id === who(c).id) fail("Vous avez déjà accès à cette piscine.");
  if (kind === "principal" && !target.is_pro)
    fail("Ce compte doit activer son espace pisciniste.");
  if (
    await row(
      c,
      "SELECT id FROM pool_members WHERE pool_id=? AND user_id=? AND revoked_at IS NULL",
      p.id,
      target.id,
    )
  )
    fail("Cette personne a déjà accès à la piscine.", 409);
  if (
    kind === "principal" &&
    (await row(
      c,
      "SELECT id FROM pool_members WHERE pool_id=? AND kind='principal' AND revoked_at IS NULL",
      p.id,
    ))
  )
    fail(
      "Cette piscine a déjà un pisciniste. Retirez son accès avant d’en choisir un autre.",
      409,
    );
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
      "INSERT INTO invitations(id,pool_id,sender_id,recipient_id,kind,expires_at) VALUES(?,?,?,?,?,?)",
      id,
      p.id,
      who(c).id,
      target.id,
      kind,
      new Date(Date.now() + 7 * 86400000).toISOString(),
    ),
    notify(
      c,
      target.id,
      "invitation",
      p.claimable
        ? "Votre pisciniste a préparé votre piscine"
        : "Invitation à partager une piscine",
      `${who(c).name} vous invite. Acceptez depuis votre espace.`,
    ),
    audit(c, "invitation.created", p.id, id),
  ]);
  return c.json({ id }, 201);
});
pools.get("/invitations", async (c) =>
  c.json({
    items: await rows(
      c,
      `SELECT i.id,i.kind,i.expires_at,p.name pool_name,u.name sender_name,CASE WHEN i.kind='owner' AND m.kind='principal' THEN 1 ELSE 0 END claim FROM invitations i JOIN pools p ON p.id=i.pool_id JOIN users u ON u.id=i.sender_id JOIN pool_members m ON m.pool_id=i.pool_id AND m.user_id=i.sender_id WHERE i.recipient_id=? AND i.kind IN('owner','principal') AND i.status='pending' AND i.expires_at>? AND ${ACTIVE} AND ${MANAGES} AND p.archived_at IS NULL ORDER BY i.created_at DESC LIMIT 100`,
      who(c).id,
      now(),
    ),
  }),
);
pools.post("/invitations/:id/respond", async (c) => {
  const b = await c.req.json();
  if (typeof b.accept !== "boolean") fail("Réponse invalide.");
  const i = await row(
    c,
    `SELECT i.*,CASE WHEN m.kind='principal' AND i.kind='owner' THEN 1 ELSE 0 END claim FROM invitations i JOIN pools p ON p.id=i.pool_id JOIN pool_members m ON m.pool_id=p.id AND m.user_id=i.sender_id WHERE i.id=? AND i.recipient_id=? AND i.status='pending' AND i.kind IN('owner','principal') AND i.expires_at>? AND ${ACTIVE} AND ${MANAGES} AND p.archived_at IS NULL`,
    c.req.param("id"),
    who(c).id,
    now(),
  );
  if (!i) fail("Invitation expirée ou indisponible.", 404);
  if (b.accept && i.kind === "principal" && !who(c).is_pro)
    fail("Activez votre espace pisciniste pour accepter.");
  const existing = str(b.existing_pool_id, 80);
  if (existing && (!b.accept || !i.claim || existing === i.pool_id))
    fail("Choix de piscine invalide.");
  if (existing) {
    const p = await access(c, existing, true);
    if (p.membership !== "owner" || !p.manager)
      fail("Choisissez une piscine dont vous gérez les accès.", 403);
    if (
      await row(
        c,
        "SELECT id FROM pool_members WHERE pool_id=? AND kind='principal' AND revoked_at IS NULL",
        existing,
      )
    )
      fail("Cette piscine a déjà un pisciniste principal.", 409);
    const used = await row(
      c,
      `SELECT 1 FROM records WHERE pool_id=? UNION ALL SELECT 1 FROM appointments WHERE pool_id=? UNION ALL SELECT 1 FROM schedules WHERE pool_id=? UNION ALL SELECT 1 FROM needs WHERE pool_id=? UNION ALL SELECT 1 FROM private_notes WHERE pool_id=? LIMIT 1`,
      ...Array(5).fill(i.pool_id),
    );
    if (used)
      fail(
        "La fiche préparée contient déjà du suivi. Refusez cette invitation, puis invitez le pisciniste depuis votre piscine existante pour conserver les deux historiques.",
        409,
      );
  }
  if (
    b.accept &&
    i.kind === "principal" &&
    (await row(
      c,
      "SELECT id FROM pool_members WHERE pool_id=? AND kind='principal' AND revoked_at IS NULL",
      i.pool_id,
    ))
  )
    fail("Cette piscine a déjà un pisciniste principal.", 409);
  const nonce = uid(),
    destination = existing || i.pool_id;
  const gate = `EXISTS(SELECT 1 FROM invitations WHERE id='${i.id.replace(/'/g, "''")}' AND resolution_nonce='${nonce}')`;
  // Recheck authorization inside the same transaction as the membership insertion.
  let guard = `EXISTS(SELECT 1 FROM pools p JOIN pool_members m ON m.pool_id=p.id WHERE p.id=invitations.pool_id AND m.user_id=invitations.sender_id AND ${ACTIVE} AND ${MANAGES} AND p.archived_at IS NULL)`;
  const args: any[] = [
    b.accept ? "accepted" : "declined",
    nonce,
    i.id,
    who(c).id,
    now(),
  ];
  if (existing) {
    guard += ` AND EXISTS(SELECT 1 FROM pools p JOIN pool_members m ON m.pool_id=p.id WHERE p.id=? AND m.user_id=? AND m.kind='owner' AND m.manager=1 AND ${ACTIVE} AND p.archived_at IS NULL) AND NOT EXISTS(SELECT 1 FROM pool_members WHERE pool_id=? AND kind='principal' AND revoked_at IS NULL) AND NOT EXISTS(SELECT 1 FROM records WHERE pool_id=invitations.pool_id) AND NOT EXISTS(SELECT 1 FROM appointments WHERE pool_id=invitations.pool_id) AND NOT EXISTS(SELECT 1 FROM schedules WHERE pool_id=invitations.pool_id) AND NOT EXISTS(SELECT 1 FROM needs WHERE pool_id=invitations.pool_id) AND NOT EXISTS(SELECT 1 FROM private_notes WHERE pool_id=invitations.pool_id)`;
    args.push(existing, who(c).id, existing);
  }
  const ops = [
    stmt(
      c,
      `UPDATE invitations SET status=?,resolution_nonce=? WHERE id=? AND recipient_id=? AND status='pending' AND expires_at>? AND ${guard}`,
      ...args,
    ),
  ];
  if (b.accept) {
    if (existing) {
      ops.push(
        stmt(
          c,
          `INSERT INTO pool_members(id,pool_id,user_id,kind,manager) SELECT ?,?,?,'principal',0 WHERE ${gate}`,
          uid(),
          existing,
          i.sender_id,
        ),
      );
      ops.push(
        stmt(
          c,
          `UPDATE pools SET archived_at=? WHERE id=? AND ${gate}`,
          now(),
          i.pool_id,
        ),
      );
      ops.push(
        stmt(
          c,
          `UPDATE pool_members SET revoked_at=? WHERE pool_id=? AND revoked_at IS NULL AND ${gate}`,
          now(),
          i.pool_id,
        ),
      );
    } else
      ops.push(
        stmt(
          c,
          `INSERT INTO pool_members(id,pool_id,user_id,kind,manager) SELECT ?,?,?,?,? WHERE ${gate}`,
          uid(),
          i.pool_id,
          who(c).id,
          i.kind,
          i.claim ? 1 : 0,
        ),
      );
    if (i.claim)
      ops.push(
        stmt(
          c,
          `UPDATE invitations SET status='cancelled' WHERE pool_id=? AND status='pending' AND ${gate}`,
          i.pool_id,
        ),
      );
  }
  ops.push(
    stmt(
      c,
      `INSERT INTO notifications(id,user_id,type,title,body,pool_id) SELECT ?,?,'invitation',?,?,? WHERE ${gate}`,
      uid(),
      i.sender_id,
      b.accept ? "Invitation acceptée" : "Invitation refusée",
      who(c).name,
      b.accept ? destination : null,
    ),
  );
  ops.push(
    stmt(
      c,
      `INSERT INTO audit(id,actor_id,pool_id,action,target_id) SELECT ?,?,?,?,? WHERE ${gate}`,
      uid(),
      who(c).id,
      i.pool_id,
      b.accept ? "invitation.accepted" : "invitation.declined",
      i.id,
    ),
  );
  const results = await c.env.DB.batch(ops);
  if (!results[0].meta.changes)
    fail("Cette invitation a changé. Actualisez votre espace.", 409);
  return c.json({ ok: true, pool_id: b.accept ? destination : null });
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
  if (p.claimable && m.user_id === who(c).id)
    fail(
      "Invitez le client ou archivez cette piscine avant de quitter le suivi.",
    );
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

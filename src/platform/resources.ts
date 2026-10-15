import { Hono } from "hono";
import {
  Env,
  ACTIVE,
  who,
  uid,
  now,
  fail,
  str,
  number,
  stmt,
  row,
  rows,
  access,
  requirePro,
  limit,
  jsonParse,
} from "./core";
import { QUIZ_BANK } from "../quiz-data";
import { REFERENCE_PROCEDURES } from "../procedure-data";
import { REFERENCE_GUIDES } from "../maintenance-guides";
export const resources = new Hono<Env>();
// Only current assignments and the professional's own published visits contribute.
// Revoking access removes a pool from these aggregates as well as from its dossier.
resources.get("/activity-summary", async (c) => {
  requirePro(c);
  const scope = `m.user_id=? AND ${ACTIVE} AND m.kind IN('principal','temporary') AND p.archived_at IS NULL`;
  const visits = `FROM records r JOIN pools p ON p.id=r.pool_id JOIN pool_members m ON m.pool_id=p.id WHERE ${scope} AND r.author_id=? AND r.kind='visit' AND r.published_at IS NOT NULL AND NOT EXISTS(SELECT 1 FROM records correction WHERE correction.correction_of=r.id AND correction.published_at IS NOT NULL)`;
  const u = who(c).id;
  const [totals, months, busiest, portfolio] = await Promise.all([
    row(
      c,
      `SELECT count(*) visits,coalesce(sum(r.duration),0) minutes ${visits}`,
      u,
      u,
    ),
    rows(
      c,
      `SELECT substr(r.measured_at,1,7) month,count(*) visits,coalesce(sum(r.duration),0) minutes ${visits} GROUP BY month ORDER BY month DESC LIMIT 12`,
      u,
      u,
    ),
    rows(
      c,
      `SELECT p.id,p.name,count(*) visits,coalesce(sum(r.duration),0) minutes ${visits} GROUP BY p.id ORDER BY visits DESC,p.name LIMIT 10`,
      u,
      u,
    ),
    row(
      c,
      `SELECT count(DISTINCT p.id) pools,count(DISTINCT owners.user_id) clients FROM pools p JOIN pool_members m ON m.pool_id=p.id LEFT JOIN pool_members owners ON owners.pool_id=p.id AND owners.kind='owner' AND owners.revoked_at IS NULL AND (owners.expires_at IS NULL OR owners.expires_at>strftime('%Y-%m-%dT%H:%M:%fZ','now')) WHERE ${scope}`,
      u,
    ),
  ]);
  return c.json({ ...totals, ...portfolio, months, busiest });
});
resources.get("/procedures/reference", (c) => {
  requirePro(c);
  return c.json({
    items: REFERENCE_PROCEDURES.map((p, id) => ({
      ...p,
      id: "reference-" + id,
      guide_id: REFERENCE_GUIDES[id] || null,
    })),
  });
});
resources.get("/procedures", async (c) => {
  requirePro(c);
  return c.json({
    items: await rows(
      c,
      "SELECT * FROM procedures WHERE owner_id=? ORDER BY important DESC,title LIMIT 200",
      who(c).id,
    ),
  });
});
resources.post("/procedures", async (c) => {
  requirePro(c);
  const b = await c.req.json(),
    id = uid();
  await stmt(
    c,
    "INSERT INTO procedures(id,owner_id,title,body,important) VALUES(?,?,?,?,?)",
    id,
    who(c).id,
    str(b.title, 160, true),
    str(b.body, 12000, true),
    b.important ? 1 : 0,
  ).run();
  return c.json({ id }, 201);
});
resources.put("/procedures/:id", async (c) => {
  requirePro(c);
  const b = await c.req.json();
  const r = await stmt(
    c,
    "UPDATE procedures SET title=?,body=?,important=? WHERE id=? AND owner_id=?",
    str(b.title, 160, true),
    str(b.body, 12000, true),
    b.important ? 1 : 0,
    c.req.param("id"),
    who(c).id,
  ).run();
  if (!r.meta.changes) fail("Fiche inaccessible.", 404);
  return c.json({ ok: true });
});
resources.delete("/procedures/:id", async (c) => {
  requirePro(c);
  await stmt(
    c,
    "DELETE FROM procedures WHERE id=? AND owner_id=?",
    c.req.param("id"),
    who(c).id,
  ).run();
  return c.json({ ok: true });
});
resources.get("/quiz", (c) => {
  requirePro(c);
  const count = Number(c.req.query("count") || 40);
  if (![10, 40].includes(count)) fail("Choisissez 10 ou 40 questions.");
  const category = c.req.query("category") || "";
  if (category && !QUIZ_BANK.some((q) => q.cat === category))
    fail("Catégorie inconnue.");
  const samples = QUIZ_BANK.map((q, id) => ({
    id,
    sort: crypto.getRandomValues(new Uint32Array(1))[0],
    category: q.cat,
    question: q.q,
    options: { a: q.a, b: q.b, c: q.c, d: q.d },
  }))
    .filter((q) => !category || q.category === category)
    .sort((a, b) => a.sort - b.sort)
    .slice(0, count)
    .map(({ sort, ...q }) => q);
  return c.json({
    items: samples,
    categories: [...new Set(QUIZ_BANK.map((q) => q.cat))],
  });
});
resources.post("/quiz", async (c) => {
  requirePro(c);
  const b = await c.req.json();
  if (
    !Array.isArray(b.answers) ||
    b.answers.length < 1 ||
    b.answers.length > 40 ||
    new Set(b.answers.map((x: any) => x.id)).size !== b.answers.length
  )
    fail("Une session contient de 1 à 40 questions distinctes.");
  const results = b.answers.map((a: any) => {
    if (typeof a.id !== "number") fail("Question invalide.");
    const id = number(a.id, 0, QUIZ_BANK.length - 1)!;
    if (!Number.isInteger(id)) fail("Question invalide.");
    if (!["a", "b", "c", "d"].includes(a.answer)) fail("Réponse invalide.");
    const q = QUIZ_BANK[id];
    return {
      id,
      correct: q.correct,
      success: q.correct === a.answer,
      explanation: q.exp || "",
    };
  });
  const score = results.filter((r: any) => r.success).length;
  await stmt(
    c,
    "INSERT INTO quiz_attempts(id,user_id,score,total) VALUES(?,?,?,?)",
    uid(),
    who(c).id,
    score,
    b.answers.length,
  ).run();
  return c.json({ score, total: b.answers.length, results });
});
resources.get("/quiz/history", async (c) => {
  requirePro(c);
  return c.json({
    items: await rows(
      c,
      "SELECT score,total,created_at FROM quiz_attempts WHERE user_id=? ORDER BY created_at DESC LIMIT 30",
      who(c).id,
    ),
  });
});
resources.get("/pools/:id/weather", async (c) => {
  const p = await access(c, c.req.param("id"));
  if (p.latitude == null) fail("Renseigne la commune de la piscine.");
  const r = await fetch(
    `https://api.open-meteo.com/v1/forecast?latitude=${p.latitude}&longitude=${p.longitude}&daily=temperature_2m_max,precipitation_sum&timezone=Europe%2FParis&forecast_days=3`,
    { signal: AbortSignal.timeout(5000) },
  );
  if (!r.ok) fail("Météo indisponible.", 503);
  const b: any = await r.json();
  return c.json({ daily: b.daily, source: "Open-Meteo", city: p.city });
});

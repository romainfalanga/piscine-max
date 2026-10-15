import { Hono } from "hono";
import {
  Env,
  C,
  requirePro,
  who,
  access,
  fail,
  row,
  stmt,
  now,
  str,
  jsonParse,
} from "./core";
import { MAINTENANCE_GUIDES } from "../maintenance-guides";
export const guides = new Hono<Env>();
guides.get("/guides", (c) => {
  requirePro(c);
  return c.json({
    items: MAINTENANCE_GUIDES.map(({ sections, ...g }) => ({
      ...g,
      step_count: sections.reduce((n, s) => n + s.steps.length, 0),
    })),
  });
});
guides.get("/guides/:id", (c) => {
  requirePro(c);
  const g = MAINTENANCE_GUIDES.find((x) => x.id === c.req.param("id"));
  if (!g) fail("Procédure introuvable.", 404);
  return c.json(g);
});
async function scope(c: C) {
  requirePro(c);
  const g = MAINTENANCE_GUIDES.find((x) => x.id === c.req.param("id"));
  if (!g) fail("Procédure introuvable.", 404);
  const poolId = str(c.req.query("pool_id") || "", 80);
  if (poolId) {
    const p = await access(c, poolId);
    if (p.membership !== "principal")
      fail("Accès professionnel requis pour cette piscine.", 403);
  }
  return { g: g!, poolId };
}
guides.get("/guides/:id/progress", async (c) => {
  const { g, poolId } = await scope(c);
  const p = await row(
    c,
    "SELECT variant,checks,revision,updated_at FROM guide_progress WHERE user_id=? AND guide_id=? AND pool_id=?",
    who(c).id,
    g.id,
    poolId,
  );
  return c.json(
    p
      ? { ...p, checks: jsonParse(p.checks, {}) }
      : { variant: g.variants ? "other" : "", checks: {}, revision: 0 },
  );
});
guides.put("/guides/:id/progress", async (c) => {
  const { g, poolId } = await scope(c),
    b = await c.req.json();
  const variant = String(b.variant || "");
  if (g.variants ? !Object.hasOwn(g.variants, variant) : variant !== "")
    fail("Type de filtre invalide.");
  if (!Number.isInteger(b.revision) || b.revision < 0)
    fail("Version de progression invalide.");
  if (!b.checks || typeof b.checks !== "object" || Array.isArray(b.checks))
    fail("Progression invalide.");
  const allowed = new Set(
    g.sections.flatMap((s) =>
      s.steps
        .filter((x) => !x.variant || x.variant === variant)
        .map((x) => x.id),
    ),
  );
  if (
    Object.entries(b.checks).some(
      ([id, v]) => !allowed.has(id) || !["done", "na"].includes(String(v)),
    )
  )
    fail("Étape ou état invalide.");
  const r =
    b.revision === 0
      ? await stmt(
          c,
          "INSERT INTO guide_progress(user_id,guide_id,pool_id,variant,checks,revision,updated_at) VALUES(?,?,?,?,?,1,?) ON CONFLICT(user_id,guide_id,pool_id) DO NOTHING",
          who(c).id,
          g.id,
          poolId,
          variant,
          JSON.stringify(b.checks),
          now(),
        ).run()
      : await stmt(
          c,
          "UPDATE guide_progress SET variant=?,checks=?,revision=revision+1,updated_at=? WHERE user_id=? AND guide_id=? AND pool_id=? AND revision=?",
          variant,
          JSON.stringify(b.checks),
          now(),
          who(c).id,
          g.id,
          poolId,
          b.revision,
        ).run();
  const changed = r.meta.changes;
  if (!changed)
    fail(
      "La progression a changé dans un autre onglet. Rechargez avant de recommencer.",
      409,
    );
  return c.json({ ok: true, revision: b.revision + 1 });
});

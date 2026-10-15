import { Hono } from "hono";
import { HTTPException } from "hono/http-exception";
import { serveStatic } from "hono/cloudflare-workers";
import { bodyLimit } from "hono/body-limit";
import { Env, uid, fail, limit, who } from "./platform/core";
import { auth, account, authenticate } from "./platform/auth";
import { pools } from "./platform/pools";
import { records } from "./platform/records";
import { planning } from "./platform/planning";
import { guides } from "./platform/guides";
import { resources } from "./platform/resources";
const app = new Hono<Env>();
app.use("*", async (c, next) => {
  c.set("requestId", uid());
  c.header("X-Content-Type-Options", "nosniff");
  c.header("Referrer-Policy", "same-origin");
  c.header("X-Frame-Options", "DENY");
  c.header(
    "Permissions-Policy",
    "camera=(self), microphone=(), geolocation=()",
  );
  c.header(
    "Content-Security-Policy",
    "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' blob: data: https://tile.openstreetmap.org; connect-src 'self'; font-src 'self'; frame-ancestors 'none'; base-uri 'self'; form-action 'self'",
  );
  await next();
});
app.use("/api/*", async (c, next) => {
  c.header("Cache-Control", "no-store");
  if (!["GET", "HEAD", "OPTIONS"].includes(c.req.method)) {
    const origin = c.req.header("Origin");
    if (origin !== new URL(c.req.url).origin)
      fail("Origine de requête non autorisée.", 403);
    const type = c.req.header("Content-Type") || "";
    if (
      !type.startsWith("application/json") &&
      !type.startsWith("multipart/form-data")
    )
      fail("Format de requête non autorisé.");
  }
  await next();
});
app.use(
  "/api/*",
  bodyLimit({
    maxSize: 5 * 1024 * 1024,
    onError: (c) =>
      c.json({ error: "Fichier trop volumineux (maximum 5 Mo)." }, 413),
  }),
);
app.get("/api/health", (c) =>
  c.json({
    ok: true,
    application: "Peace in Blue App",
    version: 2,
    release: "professional-workbench-v1",
  }),
);
app.route("/api/auth", auth);
app.use("/api/*", authenticate);
app.use("/api/*", async (c, next) => {
  if (!["GET", "HEAD"].includes(c.req.method))
    await limit(c, `write:${who(c).id}`, 120, 60);
  await next();
});
app.route("/api", account);
app.route("/api", pools);
app.route("/api", records);
app.route("/api", planning);
app.route("/api", resources);
app.route("/api", guides);
app.all("/api/*", (c) =>
  c.json({ error: "Cette fonctionnalité n’existe pas." }, 404),
);
app.use("/platform/*", serveStatic({ root: "./public" }));
app.get("/favicon.svg", serveStatic({ path: "./public/platform/favicon.svg" }));
app.get("*", (c) =>
  c.html(
    `<!doctype html><html lang="fr"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="theme-color" content="#0891b2"><meta name="description" content="Le carnet de votre piscine et le quotidien de votre pisciniste, réunis."><title>Peace in Blue App — Gestion d’entretien</title><link rel="icon" href="/favicon.svg" type="image/svg+xml"><link rel="stylesheet" href="/platform/style.css"><link rel="stylesheet" href="/platform/classic.css"><script type="module" src="/platform/app.js"></script></head><body><div id="app"><div class="loading">Peace in Blue App · Chargement…</div></div><div id="modal"></div><div id="toast" role="status" aria-live="polite"></div></body></html>`,
  ),
);
app.onError((err, c) => {
  if (err instanceof HTTPException)
    return c.json(
      { error: err.message, request_id: c.get("requestId") },
      err.status,
    );
  if (err instanceof SyntaxError)
    return c.json({ error: "Données illisibles." }, 400);
  if (String(err).includes("UNIQUE constraint"))
    return c.json(
      {
        error:
          "Cette opération a déjà été effectuée ou entre en conflit avec un accès existant.",
      },
      409,
    );
  console.error(
    JSON.stringify({
      request_id: c.get("requestId"),
      path: c.req.path,
      error: err.name,
    }),
  );
  return c.json(
    {
      error: "Une erreur est survenue. Réessaie.",
      request_id: c.get("requestId"),
    },
    500,
  );
});
export default app;

import { Hono } from "hono";
import { HTTPException } from "hono/http-exception";
import { serveStatic } from "hono/cloudflare-workers";
import { bodyLimit } from "hono/body-limit";
import { Env, uid, fail, limit, who } from "./platform/core";
import { auth, account, authenticate } from "./platform/auth";
import { connections } from "./platform/connections";
import { pools } from "./platform/pools";
import { records } from "./platform/records";
import { planning } from "./platform/planning";
import { guides } from "./platform/guides";
import { resources } from "./platform/resources";
import { locations } from "./platform/locations";
const app = new Hono<Env>();
app.use("*", async (c, next) => {
  c.set("requestId", uid());
  c.header("X-Content-Type-Options", "nosniff");
  c.header("Referrer-Policy", "strict-origin-when-cross-origin");
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
    release: "visit-flow-v9",
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
app.route("/api", locations);
app.route("/api", connections);
app.route("/api", records);
app.route("/api", planning);
app.route("/api", resources);
app.route("/api", guides);
app.all("/api/*", (c) =>
  c.json({ error: "Cette fonctionnalité n’existe pas." }, 404),
);
app.use("/platform/*", serveStatic({ root: "./public" }));
for (const asset of [
  "favicon.svg",
  "favicon.png",
  "favicon.ico",
  "apple-touch-icon.png",
  "manifest.webmanifest",
  "browserconfig.xml",
]) {
  app.get(`/${asset}`, serveStatic({ path: `./public/${asset}` }));
}
app.get("*", (c) =>
  c.html(
    `<!doctype html><html lang="fr"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="theme-color" content="#0A2540"><meta name="application-name" content="Peace in Blue App"><meta name="apple-mobile-web-app-title" content="Peace in Blue"><meta name="mobile-web-app-capable" content="yes"><meta name="apple-mobile-web-app-capable" content="yes"><meta name="apple-mobile-web-app-status-bar-style" content="default"><meta name="msapplication-TileColor" content="#0A2540"><meta name="msapplication-TileImage" content="/platform/mstile-150.png"><meta name="msapplication-config" content="/browserconfig.xml"><meta name="description" content="Le carnet de votre piscine et le quotidien de votre pisciniste, réunis."><title>Peace in Blue App : Gestion d’entretien</title><link rel="icon" href="/favicon.ico?v=brand-v6" sizes="any"><link rel="icon" type="image/png" sizes="16x16" href="/platform/icon-16.png?v=brand-v6"><link rel="icon" type="image/png" sizes="32x32" href="/platform/icon-32.png?v=brand-v6"><link rel="icon" type="image/png" sizes="256x256" href="/favicon.png?v=brand-v6"><link rel="apple-touch-icon" sizes="180x180" href="/apple-touch-icon.png?v=brand-v6"><link rel="manifest" href="/manifest.webmanifest?v=brand-v6"><link rel="stylesheet" href="/platform/style.css"><link rel="stylesheet" href="/platform/classic.css"><link rel="stylesheet" href="/platform/experience.css"><link rel="stylesheet" href="/platform/mobile.css"><script type="module" src="/platform/app.js"></script></head><body><div id="app"><div class="loading">Peace in Blue App · Chargement…</div></div><div id="modal"></div><div id="toast" role="status" aria-live="polite"></div></body></html>`,
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

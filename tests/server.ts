// Local browser harness using the same Hono API and a transactional SQLite D1 adapter.
// No public deployment. Production still requires a separate Cloudflare runtime check.
import { createServer } from "node:http";
import { readFileSync } from "node:fs";
import { randomBytes } from "node:crypto";
import app from "../src/index";
import { LocalD1, LocalR2 } from "./d1";
const env = {
  DB: new LocalD1(),
  PHOTOS: new LocalR2(),
  SESSION_SECRET: randomBytes(48).toString("hex"),
};
const realFetch = globalThis.fetch;
globalThis.fetch = async (input: any, init?: any) => {
  if (String(input).startsWith("https://data.geopf.fr/geocodage/search")) {
    return new Response(
      JSON.stringify({
        features: [
          {
            geometry: { type: "Point", coordinates: [5.7523, 43.1369] },
            properties: {
              label: "12 Rue de la République 83150 Bandol",
              city: "Bandol",
              citycode: "83009",
              type: "housenumber",
            },
          },
        ],
      }),
      { headers: { "Content-Type": "application/json" } },
    );
  }
  if (String(input).startsWith("https://geo.api.gouv.fr/communes")) {
    const url = new URL(String(input)),
      code = url.pathname.split("/")[2];
    const data = {
      code: "83009",
      nom: "Bandol",
      centre: { coordinates: [5.75, 43.14] },
      codesPostaux: ["83150"],
    };
    return new Response(JSON.stringify(code ? data : [data]), {
      headers: { "Content-Type": "application/json" },
    });
  }
  return realFetch(input, init);
};
const port = Number(process.env.PORT || 8788);
export const server = createServer(async (req, res) => {
  try {
    const url = new URL(req.url || "/", `http://127.0.0.1:${port}`);
    const staticTypes: Record<string, string> = {
      js: "text/javascript",
      css: "text/css",
      svg: "image/svg+xml",
      woff2: "font/woff2",
      png: "image/png",
      ico: "image/x-icon",
      webmanifest: "application/manifest+json",
      xml: "application/xml",
    };
    if (
      /^\/platform\/[\w.-]+\.(js|css|svg|woff2|png)$/.test(url.pathname) ||
      [
        "/favicon.svg",
        "/favicon.png",
        "/favicon.ico",
        "/apple-touch-icon.png",
        "/manifest.webmanifest",
        "/browserconfig.xml",
      ].includes(url.pathname)
    ) {
      const ext = url.pathname.split(".").pop()!;
      res.writeHead(200, { "Content-Type": staticTypes[ext] });
      res.end(
        readFileSync(new URL("../public" + url.pathname, import.meta.url)),
      );
      return;
    }
    const parts = [];
    for await (const p of req) parts.push(p);
    const body = Buffer.concat(parts);
    const r = await app.fetch(
      new Request(url, {
        method: req.method,
        headers: req.headers as any,
        ...(body.length ? { body, duplex: "half" as any } : {}),
      }),
      env as any,
    );
    const headers = Object.fromEntries(r.headers);
    res.writeHead(r.status, headers);
    res.end(Buffer.from(await r.arrayBuffer()));
  } catch {
    res.writeHead(500);
    res.end("Local test harness error");
  }
}).listen(port, "127.0.0.1", () =>
  console.log(`Local test app: http://127.0.0.1:${port}`),
);

// Trusted in-process fixture setup. There is no HTTP route for provisioning.
export function provisionProvider(email: string) {
  const u = env.DB.db
    .prepare("SELECT id FROM users WHERE login_email=?")
    .get(email);
  if (!u) throw new Error("Fixture account missing");
  env.DB.db
    .prepare("UPDATE business_provider SET user_id=? WHERE singleton=1")
    .run(u.id);
  env.DB.db.prepare("UPDATE users SET is_pro=1 WHERE id=?").run(u.id);
}

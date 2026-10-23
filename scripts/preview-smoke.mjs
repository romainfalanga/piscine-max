// End-to-end checks against the isolated Pages/D1/R2 preview. Only randomly
// named test accounts created here are cleaned up; no existing accounts touched.
import assert from "node:assert/strict";
import { randomBytes, randomUUID } from "node:crypto";
import { readFileSync, writeFileSync, appendFileSync } from "node:fs";
import { execFileSync } from "node:child_process";
const resources = JSON.parse(readFileSync("preview-resources.json", "utf8"));
assert.equal(resources.project, "peaceinblue-recette");
assert.equal(resources.database, "peaceinblue-platform-preview");
assert.equal(resources.bucket, "peaceinblue-preview-photos");
assert.notEqual(resources.database_id, "d5b477c2-1899-481d-ab38-21b95ded5e10");
const base = "https://peaceinblue-recette.pages.dev",
  account = "834ee251038ce2f923cba9847f973c40";
const prefix = "qa-" + randomBytes(5).toString("hex"),
  users = [],
  photos = [];
let poolId;
const poolIds = [];
const checks = [],
  result = { url: base, checks, passed: false, cleanup: false };
const cookie = (r) => r.headers.get("set-cookie")?.split(";")[0];
async function request(path, method = "GET", body, session = "") {
  const r = await fetch(base + "/api" + path, {
    method,
    headers: {
      Origin: base,
      ...(session ? { Cookie: session } : {}),
      ...(body !== undefined && !(body instanceof FormData)
        ? { "Content-Type": "application/json" }
        : {}),
    },
    ...(body === undefined
      ? {}
      : { body: body instanceof FormData ? body : JSON.stringify(body) }),
    redirect: "error",
    signal: AbortSignal.timeout(25000),
  });
  const data = r.headers.get("content-type")?.includes("application/json")
    ? await r.json()
    : null;
  return { status: r.status, data, cookie: cookie(r) };
}
async function signup(label, role) {
  const username = prefix + "-" + label,
    password = randomBytes(24).toString("hex");
  const r = await request("/auth/signup", "POST", {
    password,
    email: username + "@example.test",
    role,
  });
  if (r.status !== 201)
    throw new Error("Inscription de recette : HTTP " + r.status);
  users.push(r.data.user.id);
  assert.ok(r.cookie);
  assert.ok(r.data.recovery_code);
  const signedIn = await request("/auth/login", "POST", {
    email: r.data.user.email.toUpperCase(),
    password,
  });
  assert.equal(signedIn.status, 200);
  assert.equal(signedIn.data.user.id, r.data.user.id);
  assert.equal(signedIn.data.user.username, undefined);
  return { ...r.data.user, cookie: r.cookie };
}
async function cleanup() {
  if (!users.length) {
    result.cleanup = true;
    return;
  }
  for (const id of users) assert.match(id, /^[\da-f-]{36}$/);
  for (const id of poolIds) assert.match(id, /^[\da-f-]{36}$/);
  for (const key of photos) {
    assert.ok(key.startsWith("platform/" + poolId + "/"));
    execFileSync(
      "npx",
      [
        "wrangler",
        "r2",
        "object",
        "delete",
        resources.bucket + "/" + key,
        "--remote",
      ],
      { stdio: "pipe", timeout: 45000 },
    );
  }
  const list = users.map(() => "?").join(","),
    batch = [];
  for (const cleanupPoolId of poolIds) {
    for (const table of [
      "maintenance_requests",
      "notifications",
      "private_notes",
      "photos",
      "records",
      "appointments",
      "schedules",
      "invitations",
      "needs",
      "pool_members",
      "audit",
    ])
      batch.push({
        sql: `DELETE FROM ${table} WHERE pool_id=?`,
        params: [cleanupPoolId],
      });
    batch.push({
      sql: "DELETE FROM pools WHERE id=? AND created_by IN(" + list + ")",
      params: [cleanupPoolId, ...users],
    });
  }
  for (const table of ["notifications", "sessions"])
    batch.push({
      sql: `DELETE FROM ${table} WHERE user_id IN(${list})`,
      params: users,
    });
  batch.push({
    sql: `DELETE FROM audit WHERE actor_id IN(${list})`,
    params: users,
  });
  batch.push({
    sql: `DELETE FROM users WHERE id IN(${list}) AND login_email LIKE ?`,
    params: [...users, prefix + "-%"],
  });
  const r = await fetch(
    `https://api.cloudflare.com/client/v4/accounts/${account}/d1/database/${resources.database_id}/query`,
    {
      method: "POST",
      headers: {
        Authorization: "Bearer " + process.env.CLOUDFLARE_API_TOKEN,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ batch }),
      signal: AbortSignal.timeout(30000),
    },
  );
  const data = await r.json();
  if (!r.ok || data.success === false)
    throw new Error("Cleanup D1 failed: HTTP " + r.status);
  result.cleanup = true;
}
try {
  let ready = false;
  for (let i = 0; i < 20; i++) {
    try {
      const r = await request("/health");
      if (r.status === 200 && r.data?.release === "pool-routines-v13") {
        const asset = await fetch(base + "/platform/interface.css", {
          cache: "no-store",
          signal: AbortSignal.timeout(15000),
        });
        if (
          !asset.ok ||
          !(await asset.text()).includes("[data-pool-panel][hidden]")
        ) {
          await new Promise((resolve) => setTimeout(resolve, 3000));
          continue;
        }
        ready = true;
        break;
      }
    } catch {}
    await new Promise((r) => setTimeout(r, 3000));
  }
  assert.ok(ready, "New preview release and design stylesheet not ready");
  checks.push("Pages Worker online");
  for (const [path, mime] of [
    ["/", "text/html"],
    ["/platform/app.js", "javascript"],
    ["/platform/style.css", "text/css"],
    ["/platform/mobile.css", "text/css"],
    ["/platform/interface.css", "text/css"],
    ["/platform/calendar.js", "javascript"],
    ["/platform/classic.css", "text/css"],
    ["/platform/experience.css", "text/css"],
    ["/platform/maps.js", "javascript"],
    ["/platform/manrope-latin.woff2", "font/woff2"],
    ["/platform/classic.js", "javascript"],
    ["/platform/calculations.js", "javascript"],
    ["/platform/tools.js", "javascript"],
    ["/platform/leaflet.js", "javascript"],
    ["/manifest.webmanifest", "application/manifest+json"],
    ["/favicon.png", "image/png"],
    ["/favicon.ico", "image/"],
    ["/favicon.svg", "image/svg+xml"],
    ["/apple-touch-icon.png", "image/png"],
    ["/platform/brand-logo.png", "image/png"],
    ["/platform/brand-sora.woff2", "font/woff2"],
    ["/platform/icon-maskable-512.png", "image/png"],
  ]) {
    const response = await fetch(base + path, {
      redirect: "error",
      signal: AbortSignal.timeout(15000),
    });
    assert.equal(
      response.status,
      200,
      "Frontend resource unavailable: " + path,
    );
    assert.ok(
      response.headers.get("content-type")?.includes(mime),
      "Wrong frontend MIME: " + path,
    );
    assert.ok((await response.text()).length > 100);
  }
  checks.push("HTML, JavaScript and stylesheet are served correctly");
  assert.equal((await request("/pools")).status, 401);
  checks.push("Anonymous private access denied");
  const owner = await signup("owner", "client"),
    outsider = await signup("forged-pro", "pro"),
    coowner = await signup("coowner", "client");
  assert.equal(outsider.is_pro, 0);
  assert.equal(
    (await request("/business-summary", "GET", undefined, outsider.cookie))
      .status,
    403,
  );
  assert.equal(
    (
      await request(
        "/connections",
        "POST",
        { email: owner.email },
        outsider.cookie,
      )
    ).status,
    403,
  );
  assert.equal(
    (
      await request(
        "/me",
        "PUT",
        { email: owner.email, enable_pro: true },
        owner.cookie,
      )
    ).status,
    403,
  );
  checks.push("Public signup cannot acquire the reserved professional role");
  const addresses = await request(
    "/addresses?q=Place%20de%20la%20Liberte%20Toulon",
    "GET",
    undefined,
    owner.cookie,
  );
  assert.equal(addresses.status, 200);
  assert.ok(addresses.data.items.length);
  const p = await request(
    "/pools",
    "POST",
    {
      name: "Piscine de recette automatique",
      location: addresses.data.items[0],
    },
    owner.cookie,
  );
  assert.equal(p.status, 201);
  poolId = p.data.id;
  poolIds.push(poolId);
  assert.equal(
    (await request(`/pools/${poolId}`, "GET", undefined, outsider.cookie))
      .status,
    404,
  );
  const invitation = await request(
    `/pools/${poolId}/invitations`,
    "POST",
    { email: coowner.email, kind: "owner" },
    owner.cookie,
  );
  assert.equal(invitation.status, 201);
  assert.equal(
    (
      await request(
        `/invitations/${invitation.data.id}/respond`,
        "POST",
        { accept: true },
        coowner.cookie,
      )
    ).status,
    200,
  );
  assert.equal(
    (await request(`/pools/${poolId}`, "GET", undefined, coowner.cookie)).data
      .membership,
    "owner",
  );
  assert.equal(
    (
      await request(
        `/pools/${poolId}/invitations`,
        "POST",
        { email: outsider.email, kind: "principal" },
        owner.cookie,
      )
    ).status,
    403,
  );
  checks.push("Private pool, IGN address and co-ownership consent work online");
  const analysis = await request(
    `/pools/${poolId}/records`,
    "POST",
    {
      kind: "analysis",
      measured_at: new Date(Date.now() - 1000).toISOString(),
      assessments: { ph: "in_range", chlorine: "slightly_low" },
    },
    owner.cookie,
  );
  assert.equal(analysis.status, 201);
  const form = new FormData();
  form.set(
    "file",
    new File(
      [
        Buffer.from(
          "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+/a9sAAAAASUVORK5CYII=",
          "base64",
        ),
      ],
      "fixture.png",
      { type: "image/png" },
    ),
  );
  const image = await request(
    `/records/${analysis.data.id}/photos`,
    "POST",
    form,
    owner.cookie,
  );
  assert.equal(image.status, 201);
  photos.push("platform/" + poolId + "/" + image.data.id);
  assert.equal(
    (
      await request(
        `/photos/${image.data.id}`,
        "GET",
        undefined,
        outsider.cookie,
      )
    ).status,
    404,
  );
  assert.equal(
    (
      await request(
        `/records/${analysis.data.id}/publish`,
        "POST",
        {},
        owner.cookie,
      )
    ).status,
    200,
  );
  const overview = (
    await request(`/pools/${poolId}/overview`, "GET", undefined, coowner.cookie)
  ).data;
  assert.equal(overview.measurements.ph.assessment, "in_range");
  assert.equal(overview.measurements.ph.value, null);
  assert.equal(overview.measurements.chlorine.assessment, "slightly_low");
  const trends = (
    await request(`/pools/${poolId}/trends`, "GET", undefined, coowner.cookie)
  ).data;
  assert.deepEqual(trends.items, []);
  assert.equal(trends.assessments[0].assessments.ph, "in_range");
  checks.push(
    "Qualitative pH/chlorine and private R2 photos are shared without fabricated numeric readings",
  );
  assert.equal(
    (
      await request(
        `/pools/${poolId}/intervenant`,
        "POST",
        { phone: "0412345678" },
        owner.cookie,
      )
    ).status,
    400,
  );
  assert.equal(
    (
      await request(
        `/pools/${poolId}/intervenant`,
        "POST",
        { phone: "0612345678" },
        coowner.cookie,
      )
    ).status,
    403,
  );
  const demand = await request(
    `/pools/${poolId}/intervenant`,
    "POST",
    { phone: "0612345678" },
    owner.cookie,
  );
  assert.equal(demand.status, 201);
  assert.equal(
    (
      await request(
        `/pools/${poolId}/intervenant`,
        "POST",
        { phone: "0612345678" },
        owner.cookie,
      )
    ).status,
    409,
  );
  assert.equal(
    (
      await request(
        `/pools/${poolId}/intervenant`,
        "GET",
        undefined,
        coowner.cookie,
      )
    ).data.request.phone,
    null,
  );
  assert.equal(
    (
      await request(
        `/maintenance-requests/${demand.data.id}/respond`,
        "POST",
        { accept: true },
        outsider.cookie,
      )
    ).status,
    403,
  );
  // Read-only runtime verification: never promote another account or change the
  // real provider binding in a deployed smoke test.
  const dbResponse = await fetch(
    `https://api.cloudflare.com/client/v4/accounts/${account}/d1/database/${resources.database_id}/query`,
    {
      method: "POST",
      headers: {
        Authorization: "Bearer " + process.env.CLOUDFLARE_API_TOKEN,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        batch: [
          { sql: "SELECT count(*) n FROM users WHERE is_pro=1" },
          {
            sql: "SELECT b.user_id,u.login_email FROM business_provider b JOIN users u ON u.id=b.user_id WHERE u.disabled=0 AND u.is_pro=1",
          },
          {
            sql: "SELECT count(*) n FROM notifications n JOIN business_provider b ON b.user_id=n.user_id WHERE n.maintenance_request_id=?",
            params: [demand.data.id],
          },
        ],
      }),
      signal: AbortSignal.timeout(25000),
    },
  );
  const db = await dbResponse.json();
  assert.equal(db.success, true);
  assert.equal(db.result[0].results[0].n, 1);
  assert.equal(
    db.result[1].results[0].user_id,
    "bcb167e4-2ddc-45c1-816a-82e7008904af",
  );
  assert.equal(
    db.result[1].results[0].login_email,
    "romainfalanga83@gmail.com",
  );
  assert.equal(db.result[2].results[0].n, 1);
  assert.equal(
    (
      await request(
        `/pools/${poolId}/intervenant/${demand.data.id}`,
        "DELETE",
        {},
        owner.cookie,
      )
    ).status,
    200,
  );
  checks.push(
    "Regular maintenance demand requires mobile, notifies the sole provider and can be cancelled",
  );
  const csrf = await fetch(base + "/api/pools", {
    method: "POST",
    headers: {
      Origin: "https://example.invalid",
      "Content-Type": "application/json",
      Cookie: owner.cookie,
    },
    body: "{}",
  });
  assert.equal(csrf.status, 403);
  checks.push("Cross-origin writes rejected");
  result.passed = true;
} catch (error) {
  result.error = error.message;
  process.exitCode = 1;
} finally {
  try {
    await cleanup();
  } catch {
    result.cleanup = false;
    result.cleanup_error =
      "Preview test fixture cleanup incomplete; inspect the dedicated preview only.";
    process.exitCode = 1;
  }
  writeFileSync(
    "preview-validation.json",
    JSON.stringify(result, null, 2) + "\n",
  );
  console.log(JSON.stringify(result));
  if (process.env.GITHUB_STEP_SUMMARY)
    appendFileSync(
      process.env.GITHUB_STEP_SUMMARY,
      `\n## Vérification distante\n\n${result.passed ? "Parcours API validé" : "Vérification à corriger"} · ${checks.length} contrôles validés\n\nDonnées de recette nettoyées : ${result.cleanup ? "oui" : "non"}\n\n[Ouvrir la préproduction](${base})\n`,
    );
}

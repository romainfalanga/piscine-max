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
    username,
    password,
    name: "Compte de recette " + label,
    role,
  });
  if (r.status !== 201)
    throw new Error("Inscription de recette : HTTP " + r.status);
  users.push(r.data.user.id);
  assert.ok(r.cookie);
  assert.ok(r.data.recovery_code);
  return { ...r.data.user, cookie: r.cookie };
}
async function cleanup() {
  if (!users.length) {
    result.cleanup = true;
    return;
  }
  for (const id of users) assert.match(id, /^[\da-f-]{36}$/);
  if (poolId) assert.match(poolId, /^[\da-f-]{36}$/);
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
  if (poolId) {
    for (const table of [
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
        params: [poolId],
      });
    batch.push({
      sql: "DELETE FROM pools WHERE id=? AND created_by IN(" + list + ")",
      params: [poolId, ...users],
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
    sql: `DELETE FROM users WHERE id IN(${list}) AND username LIKE ?`,
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
  for (let i = 0; i < 6; i++) {
    try {
      const r = await request("/health");
      if (r.status === 200 && r.data?.version === 2) {
        ready = true;
        break;
      }
    } catch {}
    await new Promise((r) => setTimeout(r, 3000));
  }
  assert.ok(ready, "Preview health check failed");
  checks.push("Pages Worker online");
  for (const [path, mime] of [
    ["/", "text/html"],
    ["/platform/app.js", "javascript"],
    ["/platform/style.css", "text/css"],
    ["/platform/classic.css", "text/css"],
    ["/platform/classic.js", "javascript"],
    ["/platform/leaflet.js", "javascript"],
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
    pro = await signup("pro", "pro"),
    outsider = await signup("outsider", "client");
  checks.push("Client/pro signup and recovery codes work on Workers");
  const p = await request(
    "/pools",
    "POST",
    { name: "Piscine de recette automatique", treatment: "chlorine" },
    owner.cookie,
  );
  assert.equal(p.status, 201);
  poolId = p.data.id;
  assert.equal(
    (await request("/pools/" + poolId, "GET", undefined, outsider.cookie))
      .status,
    404,
  );
  assert.equal(
    (await request("/pools/" + poolId, "GET", undefined, pro.cookie)).status,
    404,
  );
  checks.push("Pool is private before invitation");
  const inv = await request(
    "/pools/" + poolId + "/invitations",
    "POST",
    { kind: "principal", username: pro.username },
    owner.cookie,
  );
  assert.equal(inv.status, 201);
  assert.equal(
    (
      await request(
        "/invitations/" + inv.data.id + "/respond",
        "POST",
        { accept: true },
        pro.cookie,
      )
    ).status,
    200,
  );
  assert.equal(
    (await request("/pools/" + poolId, "GET", undefined, pro.cookie)).status,
    200,
  );
  checks.push("Invitation and explicit professional access work");
  const record = await request(
    "/pools/" + poolId + "/records",
    "POST",
    {
      id: randomUUID(),
      kind: "visit",
      measured_at: new Date(Date.now() - 1000).toISOString(),
      readings: { ph: 7.2, chlorine: 1.5 },
      notes: "Recette automatique sans données réelles",
    },
    pro.cookie,
  );
  assert.equal(record.status, 201);
  assert.equal(
    (
      await request(
        "/records/" + record.data.id,
        "GET",
        undefined,
        owner.cookie,
      )
    ).status,
    404,
  );
  const fd = new FormData();
  fd.set(
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
    "/records/" + record.data.id + "/photos",
    "POST",
    fd,
    pro.cookie,
  );
  assert.equal(image.status, 201);
  photos.push("platform/" + poolId + "/" + image.data.id);
  assert.equal(
    (await request("/photos/" + image.data.id, "GET", undefined, owner.cookie))
      .status,
    404,
  );
  checks.push("Draft and photo are private");
  assert.equal(
    (
      await request(
        "/records/" + record.data.id + "/publish",
        "POST",
        {},
        pro.cookie,
      )
    ).status,
    200,
  );
  assert.equal(
    (
      await request(
        "/records/" + record.data.id,
        "GET",
        undefined,
        owner.cookie,
      )
    ).status,
    200,
  );
  assert.equal(
    (await request("/photos/" + image.data.id, "GET", undefined, owner.cookie))
      .status,
    200,
  );
  assert.equal(
    (
      await request(
        "/photos/" + image.data.id,
        "GET",
        undefined,
        outsider.cookie,
      )
    ).status,
    404,
  );
  checks.push(
    "Published report and R2 photo shared only with authorized client",
  );
  const details = await request(
      "/pools/" + poolId,
      "GET",
      undefined,
      owner.cookie,
    ),
    member = details.data.members.find((m) => m.user_id === pro.id);
  assert.equal(
    (
      await request(
        "/pools/" + poolId + "/members/" + member.id,
        "DELETE",
        {},
        owner.cookie,
      )
    ).status,
    200,
  );
  assert.equal(
    (await request("/records/" + record.data.id, "GET", undefined, pro.cookie))
      .status,
    404,
  );
  assert.equal(
    (await request("/photos/" + image.data.id, "GET", undefined, pro.cookie))
      .status,
    404,
  );
  assert.equal(
    (
      await request(
        "/records/" + record.data.id,
        "GET",
        undefined,
        owner.cookie,
      )
    ).status,
    200,
  );
  checks.push("Revocation denies former pro; owner history retained");
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

import { test } from "node:test";
import assert from "node:assert/strict";
import app from "../src/index";
import { LocalD1, LocalR2 } from "./d1";
import { occurs } from "../src/platform/planning";
import { cleanImage } from "../src/platform/uploads";
const realFetch = globalThis.fetch;
globalThis.fetch = async (input: any, init?: any) => {
  const url = String(input);
  if (url.startsWith("https://geo.api.gouv.fr/communes/"))
    return new Response(
      JSON.stringify({
        code: "83009",
        nom: "Bandol",
        centre: { coordinates: [5.75, 43.14] },
        codesPostaux: ["83150"],
      }),
      { headers: { "Content-Type": "application/json" } },
    );
  return realFetch(input, init);
};
const context = () => ({
  DB: new LocalD1(),
  PHOTOS: new LocalR2(),
  SESSION_SECRET: "test-only-secret-".repeat(4),
});
async function request(
  env: any,
  path: string,
  method = "GET",
  body?: any,
  token = "",
) {
  const headers: any = { Origin: "https://test.local" };
  if (token) headers.Cookie = token;
  if (body !== undefined && !(body instanceof FormData))
    headers["Content-Type"] = "application/json";
  const response = await app.request(
    "https://test.local/api" + path,
    {
      method,
      headers,
      body:
        body === undefined
          ? undefined
          : body instanceof FormData
            ? body
            : JSON.stringify(body),
    },
    env,
  );
  let data: any;
  try {
    data = await response.json();
  } catch {
    data = null;
  }
  return {
    status: response.status,
    data,
    token: response.headers.get("set-cookie")?.split(";")[0],
    response,
  };
}
async function user(env: any, name: string, role = "client") {
  const r = await request(env, "/auth/signup", "POST", {
    username: name,
    name,
    password: "Test account long password 2026!",
    role,
  });
  assert.equal(r.status, 201, JSON.stringify(r.data));
  return { ...r.data, token: r.token! };
}
async function pool(env: any, u: any, name = "Piscine privée") {
  const r = await request(
    env,
    "/pools",
    "POST",
    {
      name,
      city_code: "83009",
      address: "Adresse strictement privée",
      treatment: "chlorine",
    },
    u.token,
  );
  assert.equal(r.status, 201, JSON.stringify(r.data));
  return r.data.id;
}
async function invite(
  env: any,
  owner: any,
  target: any,
  poolId: string,
  kind: string,
  until = "2099-01-01",
) {
  const r = await request(
    env,
    "/pools/" + poolId + "/invitations",
    "POST",
    { username: target.user.username, kind, until },
    owner.token,
  );
  assert.equal(r.status, 201, JSON.stringify(r.data));
  const a = await request(
    env,
    "/invitations/" + r.data.id + "/respond",
    "POST",
    { accept: true },
    target.token,
  );
  assert.equal(a.status, 200, JSON.stringify(a.data));
  return r.data.id;
}
const measured = () => new Date(Date.now() - 10000).toISOString();
test("Public registration, no email, password recovery revokes sessions and code cannot be reused", async () => {
  const e = context(),
    a = await user(e, "alice");
  assert.ok(a.recovery_code);
  const noEmail = await request(e, "/me", "GET", undefined, a.token);
  assert.equal(noEmail.status, 200);
  assert.equal(noEmail.data.email, undefined);
  const r = await request(e, "/auth/recover", "POST", {
    username: "alice",
    code: a.recovery_code,
    password: "New long password for Alice!",
  });
  assert.equal(r.status, 200);
  assert.equal(
    (await request(e, "/me", "GET", undefined, a.token)).status,
    401,
  );
  assert.equal(
    (
      await request(e, "/auth/recover", "POST", {
        username: "alice",
        code: a.recovery_code,
        password: "Another long password!",
      })
    ).status,
    401,
  );
  assert.equal(
    (await request(e, "/me", "GET", undefined, r.token)).status,
    200,
  );
});
test("Missing secret fails closed and cross-origin writes are forbidden", async () => {
  const e = context();
  delete (e as any).SESSION_SECRET;
  assert.equal(
    (
      await request(e, "/auth/signup", "POST", {
        username: "nobody",
        name: "No body",
        password: "very long password",
        role: "client",
      })
    ).status,
    503,
  );
  const r = await app.request(
    "https://test.local/api/auth/signup",
    {
      method: "POST",
      headers: {
        Origin: "https://evil.local",
        "Content-Type": "application/json",
      },
      body: "{}",
    },
    e as any,
  );
  assert.equal(r.status, 403);
});
test("Co-ownership invitation requires acceptance; client and pro accounts have no ambient pool access", async () => {
  const e = context(),
    a = await user(e, "alice"),
    b = await user(e, "bob"),
    p = await user(e, "paul", "pro"),
    id = await pool(e, a);
  assert.equal(
    (await request(e, "/pools/" + id, "GET", undefined, b.token)).status,
    404,
  );
  assert.equal(
    (await request(e, "/pools/" + id, "GET", undefined, p.token)).status,
    404,
  );
  await invite(e, a, b, id, "owner");
  assert.equal(
    (await request(e, "/pools/" + id, "GET", undefined, b.token)).status,
    200,
  );
  assert.equal(
    (
      await request(
        e,
        "/pools/" + id + "/invitations",
        "POST",
        { username: "paul", kind: "principal" },
        b.token,
      )
    ).status,
    403,
  );
  await invite(e, a, p, id, "principal");
  assert.equal(
    (await request(e, "/pools/" + id, "GET", undefined, p.token)).status,
    200,
  );
  assert.equal(
    (
      await request(
        e,
        "/clients",
        "POST",
        { name: "Unauthorized account creation" },
        p.token,
      )
    ).status,
    404,
  );
});
test("Exactly one principal, no duplicate invitation acceptance, and revocation stops photo and draft access", async () => {
  const e = context(),
    a = await user(e, "alice"),
    p = await user(e, "paul", "pro"),
    q = await user(e, "quentin", "pro"),
    id = await pool(e, a);
  const invitation = await invite(e, a, p, id, "principal");
  assert.equal(
    (
      await request(
        e,
        "/invitations/" + invitation + "/respond",
        "POST",
        { accept: true },
        p.token,
      )
    ).status,
    404,
  );
  const i = await request(
    e,
    "/pools/" + id + "/invitations",
    "POST",
    { username: "quentin", kind: "principal" },
    a.token,
  );
  assert.equal(i.status, 201);
  assert.equal(
    (
      await request(
        e,
        "/invitations/" + i.data.id + "/respond",
        "POST",
        { accept: true },
        q.token,
      )
    ).status,
    409,
  );
  const r = await request(
    e,
    "/pools/" + id + "/records",
    "POST",
    { kind: "visit", measured_at: measured(), readings: { ph: 7.2 } },
    p.token,
  );
  assert.equal(r.status, 201);
  assert.equal(
    (await request(e, "/records/" + r.data.id, "GET", undefined, a.token))
      .status,
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
      "pool.png",
      { type: "image/png" },
    ),
  );
  const photo = await request(
    e,
    "/records/" + r.data.id + "/photos",
    "POST",
    fd,
    p.token,
  );
  assert.equal(photo.status, 201, JSON.stringify(photo.data));
  assert.equal(
    (await request(e, "/photos/" + photo.data.id, "GET", undefined, a.token))
      .status,
    404,
  );
  assert.equal(
    (
      await request(
        e,
        "/records/" + r.data.id + "/publish",
        "POST",
        {},
        p.token,
      )
    ).status,
    200,
  );
  assert.equal(
    (await request(e, "/photos/" + photo.data.id, "GET", undefined, a.token))
      .status,
    200,
  );
  const details = await request(e, "/pools/" + id, "GET", undefined, a.token);
  const member = details.data.members.find((m: any) => m.user_id === p.user.id);
  assert.equal(
    (
      await request(
        e,
        "/pools/" + id + "/members/" + member.id,
        "DELETE",
        {},
        a.token,
      )
    ).status,
    200,
  );
  assert.equal(
    (await request(e, "/photos/" + photo.data.id, "GET", undefined, p.token))
      .status,
    404,
  );
  assert.equal(
    (await request(e, "/records/" + r.data.id, "GET", undefined, p.token))
      .status,
    404,
  );
  assert.equal(
    (await request(e, "/records/" + r.data.id, "GET", undefined, a.token))
      .status,
    200,
  );
});
test("Analysis without appointment, idempotent create, corrections, complete pagination and bounded trends", async () => {
  const e = context(),
    a = await user(e, "alice"),
    id = await pool(e, a),
    rid = crypto.randomUUID();
  const body = {
    id: rid,
    kind: "analysis",
    measured_at: measured(),
    readings: { ph: 7.2, chlorine: 0 },
    notes: "self reading",
  };
  assert.equal(
    (await request(e, "/pools/" + id + "/records", "POST", body, a.token))
      .status,
    201,
  );
  assert.equal(
    (await request(e, "/pools/" + id + "/records", "POST", body, a.token))
      .status,
    200,
  );
  assert.equal(
    (await request(e, "/records/" + rid + "/publish", "POST", {}, a.token))
      .status,
    200,
  );
  assert.equal(
    (
      await request(
        e,
        "/records/" + rid,
        "PUT",
        { ...body, revision: 1 },
        a.token,
      )
    ).status,
    403,
  );
  const correction = await request(
    e,
    "/pools/" + id + "/records",
    "POST",
    {
      ...body,
      id: crypto.randomUUID(),
      correction_of: rid,
      readings: { ph: 7.4 },
    },
    a.token,
  );
  assert.equal(correction.status, 201);
  await request(
    e,
    "/records/" + correction.data.id + "/publish",
    "POST",
    {},
    a.token,
  );
  const history = await request(
    e,
    "/pools/" + id + "/records?limit=1",
    "GET",
    undefined,
    a.token,
  );
  assert.equal(history.data.items.length, 1);
  assert.ok(history.data.next);
  const next = await request(
    e,
    "/pools/" + id + "/records?limit=1&cursor=" + history.data.next,
    "GET",
    undefined,
    a.token,
  );
  assert.equal(next.data.items.length, 1);
  const trends = await request(
    e,
    "/pools/" + id + "/trends",
    "GET",
    undefined,
    a.token,
  );
  assert.equal(trends.data.items[0].ph, 7.4);
  assert.equal(
    (
      await request(
        e,
        "/pools/" + id + "/records",
        "POST",
        { ...body, id: crypto.randomUUID(), readings: { ph: 99 } },
        a.token,
      )
    ).status,
    400,
  );
});
test("Professional private notes never appear in client exports or reports", async () => {
  const e = context(),
    a = await user(e, "alice"),
    p = await user(e, "paul", "pro"),
    id = await pool(e, a);
  await invite(e, a, p, id, "principal");
  await request(
    e,
    "/pools/" + id + "/notes",
    "PUT",
    { body: "PROFESSIONAL_SECRET" },
    p.token,
  );
  assert.equal(
    (await request(e, "/pools/" + id + "/notes", "GET", undefined, a.token))
      .status,
    403,
  );
  const result = await request(
    e,
    "/pools/" + id + "/export",
    "GET",
    undefined,
    a.token,
  );
  assert.equal(result.status, 200);
  assert.ok(!JSON.stringify(result.data).includes("PROFESSIONAL_SECRET"));
});
test("Supply lifecycle sends differentiated notifications, concurrent revision rejected", async () => {
  const e = context(),
    a = await user(e, "alice"),
    p = await user(e, "paul", "pro"),
    id = await pool(e, a);
  await invite(e, a, p, id, "principal");
  const need = await request(
    e,
    "/pools/" + id + "/needs",
    "POST",
    { title: "Cartouche", responsible: "client", quantity: "1 pièce" },
    p.token,
  );
  assert.equal(need.status, 201);
  let notices = await request(e, "/notifications", "GET", undefined, a.token);
  assert.ok(notices.data.items.some((n: any) => n.title.includes("achat")));
  assert.equal(
    (
      await request(
        e,
        "/needs/" + need.data.id,
        "PUT",
        { status: "ready", revision: 1 },
        a.token,
      )
    ).status,
    200,
  );
  assert.equal(
    (
      await request(
        e,
        "/needs/" + need.data.id,
        "PUT",
        { status: "cancelled", revision: 1 },
        p.token,
      )
    ).status,
    409,
  );
  assert.equal(
    (
      await request(
        e,
        "/needs/" + need.data.id,
        "PUT",
        { status: "delivered", revision: 2 },
        p.token,
      )
    ).status,
    200,
  );
});
test("Planning exceptions are isolated, deleting recurrence preserves completed history", async () => {
  const e = context(),
    a = await user(e, "alice"),
    p = await user(e, "paul", "pro"),
    id = await pool(e, a);
  await invite(e, a, p, id, "principal");
  const s = await request(
    e,
    "/pools/" + id + "/schedules",
    "POST",
    { start_date: "2026-10-01", interval_days: 7, time: "09:00" },
    p.token,
  );
  assert.equal(s.status, 201);
  const list = await request(
    e,
    "/planning?from=2026-10-01&to=2026-10-31",
    "GET",
    undefined,
    p.token,
  );
  assert.equal(list.data.items.length, 5);
  const occurrence = await request(
    e,
    "/schedules/" + s.data.id + "/occurrence",
    "POST",
    { date: "2026-10-01" },
    p.token,
  );
  assert.equal(occurrence.status, 200);
  const rec = await request(
    e,
    "/pools/" + id + "/records",
    "POST",
    {
      kind: "visit",
      measured_at: "2026-10-01T10:00:00Z",
      appointment_id: occurrence.data.id,
    },
    p.token,
  );
  await request(e, "/records/" + rec.data.id + "/publish", "POST", {}, p.token);
  await request(e, "/schedules/" + s.data.id, "DELETE", {}, p.token);
  const history = await request(
    e,
    "/pools/" + id + "/records",
    "GET",
    undefined,
    a.token,
  );
  assert.equal(history.data.items.length, 1);
  assert.equal(
    (
      await request(
        e,
        "/planning?from=2026-10-01&to=2027-10-01",
        "GET",
        undefined,
        p.token,
      )
    ).status,
    400,
  );
});
test("Expired temporary membership cannot access pool or records", async () => {
  const e = context(),
    a = await user(e, "alice"),
    p = await user(e, "paul", "pro"),
    id = await pool(e, a);
  e.DB.db
    .prepare(
      "INSERT INTO pool_members(id,pool_id,user_id,kind,expires_at) VALUES(?,?,?,'temporary','2020-01-01T00:00:00Z')",
    )
    .run(crypto.randomUUID(), id, p.user.id);
  assert.equal(
    (await request(e, "/pools/" + id, "GET", undefined, p.token)).status,
    404,
  );
});
test("Season recurrence respects dates, weekday and year wrap", () => {
  const s = {
    active: 1,
    start_date: "2026-01-01",
    interval_days: 7,
    seasons: [
      { start: "11-01", end: "03-31", interval_days: 14, weekday: 1 },
      { start: "04-01", end: "10-31", interval_days: 7, weekday: 1 },
    ],
  };
  assert.equal(occurs(s, "2026-04-06"), true);
  assert.equal(occurs(s, "2026-04-07"), false);
  assert.equal(occurs({ ...s, end_date: "2026-04-01" }, "2026-04-06"), false);
  assert.equal(occurs(s, "2026-11-02"), true);
  assert.equal(occurs(s, "2026-11-09"), false);
  assert.equal(occurs(s, "2026-11-16"), true);
});
test("Reject active content and malformed uploads", () => {
  assert.throws(() =>
    cleanImage(
      new TextEncoder().encode(
        '<svg xmlns="http://www.w3.org/2000/svg"><script>alert(1)</script></svg>',
      ),
    ),
  );
  assert.throws(() => cleanImage(new Uint8Array([1, 2, 3])));
});

test("A fresh invitation can renew an expired temporary membership", async () => {
  const e = context(),
    a = await user(e, "alice"),
    p = await user(e, "paul", "pro"),
    id = await pool(e, a);
  e.DB.db
    .prepare(
      "INSERT INTO pool_members(id,pool_id,user_id,kind,expires_at) VALUES(?,?,?,'temporary','2020-01-01T00:00:00Z')",
    )
    .run(crypto.randomUUID(), id, p.user.id);
  await invite(
    e,
    a,
    p,
    id,
    "temporary",
    new Date(Date.now() + 14 * 86400000).toISOString().slice(0, 10),
  );
  assert.equal(
    (await request(e, "/pools/" + id, "GET", undefined, p.token)).status,
    200,
  );
});
test("Manager transfer preserves co-owner history and stops former manager changing access", async () => {
  const e = context(),
    a = await user(e, "alice"),
    b = await user(e, "bob"),
    p = await user(e, "paul", "pro"),
    id = await pool(e, a);
  await invite(e, a, b, id, "owner");
  const d = await request(e, "/pools/" + id, "GET", undefined, a.token);
  const member = d.data.members.find((m: any) => m.user_id === b.user.id);
  assert.equal(
    (
      await request(
        e,
        "/pools/" + id + "/manager",
        "POST",
        { member_id: member.id },
        a.token,
      )
    ).status,
    200,
  );
  assert.equal(
    (
      await request(
        e,
        "/pools/" + id + "/invitations",
        "POST",
        { username: p.user.username, kind: "principal" },
        a.token,
      )
    ).status,
    403,
  );
  await invite(e, b, p, id, "principal");
  assert.equal(
    (await request(e, "/pools/" + id, "GET", undefined, a.token)).status,
    200,
  );
});

test("Classic clients, map and activity stats only expose current assignments and active co-owners", async () => {
  const e = context(),
    owner = await user(e, "elise"),
    coowner = await user(e, "marie"),
    pro = await user(e, "benoit", "pro"),
    stranger = await user(e, "arthur", "pro"),
    id = await pool(e, owner, "Les Pins");
  await invite(e, owner, coowner, id, "owner");
  await invite(e, owner, pro, id, "principal");
  const list = await request(
    e,
    "/pools?mode=pro&q=marie",
    "GET",
    undefined,
    pro.token,
  );
  assert.equal(list.status, 200);
  assert.equal(list.data.items.length, 1);
  assert.equal(list.data.items[0].address, "Adresse strictement privée");
  assert.equal(list.data.items[0].latitude, 43.14);
  assert.deepEqual(
    list.data.items[0].owners.map((u: any) => u.username).sort(),
    ["elise", "marie"],
  );
  assert.equal(
    (
      await request(
        e,
        "/pools?mode=pro&q=marie",
        "GET",
        undefined,
        stranger.token,
      )
    ).data.items.length,
    0,
  );
  assert.equal(
    (await request(e, "/activity-summary", "GET", undefined, owner.token))
      .status,
    403,
  );
  const draft = await request(
    e,
    `/pools/${id}/records`,
    "POST",
    {
      kind: "visit",
      measured_at: measured(),
      duration: 45,
      readings: { ph: 7.2 },
    },
    pro.token,
  );
  assert.equal(draft.status, 201);
  assert.equal(
    (await request(e, "/activity-summary", "GET", undefined, pro.token)).data
      .visits,
    0,
  );
  await request(e, `/records/${draft.data.id}/publish`, "POST", {}, pro.token);
  const stats = (
    await request(e, "/activity-summary", "GET", undefined, pro.token)
  ).data;
  assert.equal(stats.pools, 1);
  assert.equal(stats.clients, 2);
  assert.equal(stats.visits, 1);
  assert.equal(stats.minutes, 45);
  assert.equal(stats.months[0].visits, 1);
  assert.equal(
    (await request(e, "/activity-summary", "GET", undefined, stranger.token))
      .data.visits,
    0,
  );
  const detail = await request(
    e,
    `/pools/${id}`,
    "GET",
    undefined,
    owner.token,
  );
  const member = detail.data.members.find(
    (m: any) => m.user_id === pro.user.id,
  );
  assert.equal(
    (
      await request(
        e,
        `/pools/${id}/members/${member.id}`,
        "DELETE",
        {},
        owner.token,
      )
    ).status,
    200,
  );
  assert.equal(
    (await request(e, "/pools?mode=pro", "GET", undefined, pro.token)).data
      .items.length,
    0,
  );
  const after = (
    await request(e, "/activity-summary", "GET", undefined, pro.token)
  ).data;
  assert.equal(after.pools, 0);
  assert.equal(after.clients, 0);
  assert.equal(after.visits, 0);
  assert.equal(after.busiest.length, 0);
});

test("Removed community and AI routes are unavailable to clients and professionals", async () => {
  const e = context(),
    client = await user(e, "alice"),
    pro = await user(e, "paul", "pro");
  for (const u of [client, pro])
    for (const path of [
      "/help",
      "/help/anything",
      "/offers/anything",
      "/admin/flags",
      "/assistant",
      "/tools/config",
    ]) {
      assert.equal(
        (await request(e, path, "GET", undefined, u.token)).status,
        404,
        path,
      );
      assert.equal(
        (await request(e, path, "POST", {}, u.token)).status,
        404,
        path,
      );
    }
  const health = await request(e, "/health");
  assert.equal(health.data.application, "Peace in Blue App");
});
test("Guided checklists are personal, scoped to assigned pools, validate variants and reject stale saves", async () => {
  const e = context(),
    owner = await user(e, "alice"),
    pro = await user(e, "paul", "pro"),
    other = await user(e, "quentin", "pro"),
    id = await pool(e, owner);
  assert.equal(
    (await request(e, "/guides", "GET", undefined, owner.token)).status,
    403,
  );
  const guides = await request(e, "/guides", "GET", undefined, pro.token);
  assert.equal(guides.data.items.length, 8);
  const path = "/guides/entretien/progress?pool_id=" + id;
  assert.equal(
    (await request(e, path, "GET", undefined, pro.token)).status,
    404,
  );
  await invite(e, owner, pro, id, "principal");
  const body = {
    revision: 0,
    variant: "sand",
    checks: { arrival: "done", "sand-wash": "na" },
  };
  let saved = await request(e, path, "PUT", body, pro.token);
  assert.equal(saved.status, 200, JSON.stringify(saved.data));
  assert.equal(saved.data.revision, 1);
  assert.equal((await request(e, path, "PUT", body, pro.token)).status, 409);
  assert.equal(
    (
      await request(
        e,
        path,
        "PUT",
        { ...body, revision: 1, checks: { "cartridge-safe": "done" } },
        pro.token,
      )
    ).status,
    400,
  );
  assert.equal(
    (
      await request(
        e,
        path,
        "PUT",
        { ...body, revision: 1, variant: "unknown" },
        pro.token,
      )
    ).status,
    400,
  );
  saved = await request(
    e,
    path,
    "PUT",
    { ...body, revision: 1, checks: { arrival: "done", analysis: "done" } },
    pro.token,
  );
  assert.equal(saved.status, 200);
  assert.equal(saved.data.revision, 2);
  assert.equal(
    (await request(e, path, "GET", undefined, pro.token)).data.checks.analysis,
    "done",
  );
  assert.equal(
    (await request(e, path, "GET", undefined, other.token)).status,
    404,
  );
  await invite(
    e,
    owner,
    other,
    id,
    "temporary",
    new Date(Date.now() + 7 * 86400000).toISOString().slice(0, 10),
  );
  assert.equal(
    (await request(e, path, "GET", undefined, other.token)).data.revision,
    0,
  );
  assert.equal(
    (
      await request(
        e,
        "/guides/entretien/progress",
        "GET",
        undefined,
        pro.token,
      )
    ).data.revision,
    0,
  );
  assert.equal(
    (
      await request(
        e,
        "/pools/" + id + "/records",
        "GET",
        undefined,
        owner.token,
      )
    ).data.items.length,
    0,
    "Checklist never publishes a report",
  );
  e.DB.db
    .prepare(
      "UPDATE pool_members SET revoked_at=? WHERE pool_id=? AND user_id=?",
    )
    .run(new Date().toISOString(), id, pro.user.id);
  assert.equal(
    (await request(e, path, "GET", undefined, pro.token)).status,
    404,
  );
  assert.equal(
    (await request(e, path, "PUT", { ...body, revision: 2 }, pro.token)).status,
    404,
  );
});
test("Code du pisciniste supports short themed practice and complete sessions with private history", async () => {
  const e = context(),
    pro = await user(e, "paul", "pro"),
    other = await user(e, "quentin", "pro");
  const short = await request(
    e,
    "/quiz?count=10&category=" + encodeURIComponent("Analyse & routine"),
    "GET",
    undefined,
    pro.token,
  );
  assert.ok(short.data.items.length > 0 && short.data.items.length <= 10);
  assert.ok(
    short.data.items.every(
      (q: any) => q.category === "Analyse & routine" && !("correct" in q),
    ),
  );
  const full = await request(e, "/quiz?count=40", "GET", undefined, pro.token);
  assert.equal(full.data.items.length, 40);
  const answers = short.data.items.map((q: any) => ({ id: q.id, answer: "a" }));
  const r = await request(e, "/quiz", "POST", { answers }, pro.token);
  assert.equal(r.status, 200);
  assert.equal(r.data.total, answers.length);
  assert.equal(
    (await request(e, "/quiz/history", "GET", undefined, pro.token)).data.items
      .length,
    1,
  );
  assert.equal(
    (await request(e, "/quiz/history", "GET", undefined, other.token)).data
      .items.length,
    0,
  );
  assert.equal(
    (
      await request(
        e,
        "/quiz",
        "POST",
        { answers: [answers[0], answers[0]] },
        pro.token,
      )
    ).status,
    400,
  );
  assert.equal(
    (
      await request(
        e,
        "/quiz",
        "POST",
        { answers: [{ id: String(answers[0].id), answer: "a" }] },
        pro.token,
      )
    ).status,
    400,
  );
  assert.equal(
    (
      await request(
        e,
        "/quiz",
        "POST",
        { answers: [{ id: answers[0].id, answer: "bad" }] },
        pro.token,
      )
    ).status,
    400,
  );
  assert.equal(
    (
      await request(
        e,
        "/quiz?count=10&category=invalid",
        "GET",
        undefined,
        pro.token,
      )
    ).status,
    400,
  );
  assert.equal(
    (await request(e, "/quiz?count=100", "GET", undefined, pro.token)).status,
    400,
  );
});

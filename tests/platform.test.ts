import { readFileSync } from "node:fs";
import { test } from "node:test";
import assert from "node:assert/strict";
import app from "../src/index";
import { LocalD1, LocalR2 } from "./d1";
import { maintenanceTasks } from "../src/platform/maintenance";
import { occurs } from "../src/platform/planning";
import { cleanImage } from "../src/platform/uploads";
const realFetch = globalThis.fetch;
globalThis.fetch = async (input: any, init?: any) => {
  const url = String(input);
  if (url.startsWith("https://data.geopf.fr/geocodage/search")) {
    if (url.includes("indisponible")) throw new Error("Network fixture");
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
async function completeVisit(env: any, id: string, token: string) {
  const { data: r } = await request(
    env,
    "/records/" + id,
    "GET",
    undefined,
    token,
  );
  const saved = await request(
    env,
    "/records/" + id,
    "PUT",
    {
      ...r,
      readings: { ph: 7.2, chlorine: 1.5 },
      checklist: r.checklist.map((t: any) => ({ ...t, done: true })),
      revision: r.revision,
    },
    token,
  );
  assert.equal(saved.status, 200, JSON.stringify(saved.data));
}
async function user(env: any, name: string, role = "client") {
  const r = await request(env, "/auth/signup", "POST", {
    email: name + "@example.test",
    password: "Test account long password 2026!",
    role,
  });
  assert.equal(r.status, 201, JSON.stringify(r.data));
  // Trusted fixture provisioning, never a public signup privilege.
  if (
    role === "pro" &&
    env.DB.db
      .prepare("SELECT name FROM sqlite_master WHERE name='business_provider'")
      .get() &&
    !env.DB.db
      .prepare("SELECT user_id FROM business_provider WHERE singleton=1")
      .get().user_id
  ) {
    env.DB.db
      .prepare("UPDATE business_provider SET user_id=? WHERE singleton=1")
      .run(r.data.user.id);
    env.DB.db
      .prepare("UPDATE users SET is_pro=1 WHERE id=?")
      .run(r.data.user.id);
    r.data.user.is_pro = 1;
  }
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
  if (kind === "principal") {
    const demand = await request(
      env,
      `/pools/${poolId}/intervenant`,
      "POST",
      { phone: "0612345678" },
      owner.token,
    );
    assert.equal(demand.status, 201, JSON.stringify(demand.data));
    const linked = await request(
      env,
      `/maintenance-requests/${demand.data.id}/respond`,
      "POST",
      { accept: true },
      target.token,
    );
    assert.equal(linked.status, 200, JSON.stringify(linked.data));
    return demand.data.id;
  }
  const r = await request(
    env,
    "/pools/" + poolId + "/invitations",
    "POST",
    { email: target.user.email, kind, until },
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
test("Registration stores private identity, password recovery revokes sessions and code cannot be reused", async () => {
  const e = context(),
    a = await user(e, "alice");
  assert.ok(a.recovery_code);
  const noEmail = await request(e, "/me", "GET", undefined, a.token);
  assert.equal(noEmail.status, 200);
  assert.equal(noEmail.data.email, "alice@example.test");
  assert.equal(noEmail.data.first_name, undefined);
  assert.equal(noEmail.data.last_name, undefined);
  const r = await request(e, "/auth/recover", "POST", {
    email: "alice@example.test",
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
        email: "alice@example.test",
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
        email: "nobody@example.test",
        first_name: "No",
        last_name: "Body",
        email: "nobody@example.test",
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
        { email: "paul@example.test", kind: "principal" },
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
    { email: "quentin@example.test", kind: "principal" },
    a.token,
  );
  assert.equal(i.status, 403);
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
  await completeVisit(e, r.data.id, p.token);
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
        p.token,
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
  await completeVisit(e, rec.data.id, p.token);
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
        { email: p.user.email, kind: "principal" },
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
  assert.deepEqual(list.data.items[0].owners.map((u: any) => u.email).sort(), [
    "elise@example.test",
    "marie@example.test",
  ]);
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
  await completeVisit(e, draft.data.id, pro.token);
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
      .status,
    403,
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
    403,
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
    (await request(e, "/quiz/history", "GET", undefined, other.token)).status,
    403,
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

test("Professional can create a pool, invite its client and hand ownership over without losing the agenda", async () => {
  const e = context(),
    pro = await user(e, "paul", "pro"),
    client = await user(e, "alice"),
    other = await user(e, "quentin", "pro");
  assert.equal(
    (
      await request(
        e,
        "/pools",
        "POST",
        { name: "Interdit", mode: "pro" },
        client.token,
      )
    ).status,
    403,
  );
  const created = await request(
    e,
    "/pools",
    "POST",
    {
      name: "Bassin créé par Paul",
      mode: "pro",
      client_email: "alice@example.test",
    },
    pro.token,
  );
  assert.equal(created.status, 201, JSON.stringify(created.data));
  const id = created.data.id;
  let p = await request(e, "/pools/" + id, "GET", undefined, pro.token);
  assert.equal(p.data.membership, "principal");
  assert.equal(p.data.claimable, 1);
  assert.equal(p.data.members.filter((m: any) => m.kind === "owner").length, 0);
  assert.equal(
    (await request(e, "/pools?mode=pro", "GET", undefined, pro.token)).data
      .items.length,
    1,
  );
  assert.equal(
    (await request(e, "/pools?mode=client", "GET", undefined, pro.token)).data
      .items.length,
    0,
  );
  assert.equal(
    (await request(e, "/pools/" + id, "GET", undefined, client.token)).status,
    404,
  );
  assert.equal(
    (await request(e, "/pools/" + id, "GET", undefined, other.token)).status,
    404,
  );
  const ap = await request(
    e,
    "/pools/" + id + "/appointments",
    "POST",
    {
      date: new Date().toISOString().slice(0, 10),
      time: "09:00",
      duration: 45,
      title: "Entretien",
    },
    pro.token,
  );
  assert.equal(ap.status, 201, JSON.stringify(ap.data));
  const inv = (await request(e, "/invitations", "GET", undefined, client.token))
    .data.items[0];
  assert.equal(inv.claim, 1);
  assert.equal(
    (
      await request(
        e,
        "/invitations/" + inv.id + "/respond",
        "POST",
        { accept: true },
        client.token,
      )
    ).status,
    200,
  );
  p = await request(e, "/pools/" + id, "GET", undefined, client.token);
  assert.equal(p.data.membership, "owner");
  assert.equal(p.data.manager, 1);
  assert.equal(
    p.data.members.filter((m: any) => m.kind === "principal").length,
    1,
  );
  assert.equal(
    (await request(e, "/pools/" + id, "GET", undefined, pro.token)).data
      .claimable,
    0,
  );
  assert.equal(
    (
      await request(
        e,
        "/pools/" + id + "/invitations",
        "POST",
        { email: "quentin@example.test", kind: "owner" },
        pro.token,
      )
    ).status,
    403,
  );
  assert.equal(
    (
      await request(
        e,
        "/pools/" + id + "/invitations",
        "POST",
        { email: "quentin@example.test", kind: "principal" },
        client.token,
      )
    ).status,
    403,
  );
  assert.equal(
    (
      await request(
        e,
        "/pools/" + id + "/invitations",
        "POST",
        {
          email: "quentin@example.test",
          kind: "temporary",
          until: "2099-01-01",
        },
        client.token,
      )
    ).status,
    400,
  );
  const m = p.data.members.find((m: any) => m.user_id === pro.user.id);
  await request(
    e,
    "/pools/" + id + "/members/" + m.id,
    "DELETE",
    {},
    client.token,
  );
  assert.equal(
    (await request(e, "/pools/" + id, "GET", undefined, pro.token)).status,
    404,
  );
  assert.equal(
    (await request(e, "/pools?mode=pro", "GET", undefined, pro.token)).data
      .items.length,
    0,
  );
  assert.equal(
    (
      await request(
        e,
        "/connections",
        "POST",
        { email: client.user.email },
        other.token,
      )
    ).status,
    403,
  );
  await invite(e, client, pro, id, "principal");
  assert.equal(
    (await request(e, "/pools/" + id, "GET", undefined, pro.token)).status,
    200,
  );
});
test("Professional requests an existing pool; only its client manager can authorize and no duplicate is created", async () => {
  const e = context(),
    owner = await user(e, "alice"),
    coowner = await user(e, "bob"),
    pro = await user(e, "paul", "pro"),
    other = await user(e, "quentin", "pro"),
    id = await pool(e, owner);
  await invite(e, owner, coowner, id, "owner");
  const create = await request(
    e,
    "/connections",
    "POST",
    { email: "alice@example.test" },
    pro.token,
  );
  assert.equal(create.status, 201);
  const requestId = create.data.id;
  assert.equal(
    (
      await request(
        e,
        "/connections",
        "POST",
        { email: "alice@example.test" },
        pro.token,
      )
    ).status,
    409,
  );
  assert.equal(
    (await request(e, "/pools/" + id, "GET", undefined, pro.token)).status,
    404,
  );
  const incoming = (
    await request(e, "/connections", "GET", undefined, owner.token)
  ).data.incoming;
  assert.equal(incoming.length, 1);
  assert.equal(incoming[0].email, "paul@example.test");
  assert.ok(!JSON.stringify(incoming).includes(id));
  assert.equal(
    (
      await request(
        e,
        "/connections/" + requestId + "/respond",
        "POST",
        { accept: true, pool_id: id },
        coowner.token,
      )
    ).status,
    404,
  );
  assert.equal(
    (
      await request(
        e,
        "/connections/" + requestId + "/respond",
        "POST",
        { accept: true, pool_id: id },
        owner.token,
      )
    ).status,
    200,
  );
  assert.equal(e.DB.db.prepare("SELECT count(*) n FROM pools").get()!.n, 1);
  assert.equal(
    (await request(e, "/pools/" + id, "GET", undefined, pro.token)).data
      .membership,
    "principal",
  );
  assert.equal(
    (
      await request(
        e,
        "/connections/" + requestId + "/respond",
        "POST",
        { accept: true, pool_id: id },
        owner.token,
      )
    ).status,
    404,
  );
  const second = await request(
    e,
    "/connections",
    "POST",
    { email: "alice@example.test" },
    pro.token,
  );
  assert.equal(
    (
      await request(
        e,
        "/connections/" + second.data.id + "/respond",
        "POST",
        { accept: true, pool_id: id },
        owner.token,
      )
    ).status,
    409,
  );
  assert.equal(
    (await request(e, "/pools/" + id, "GET", undefined, other.token)).status,
    404,
  );
  const co = await request(
    e,
    "/connections",
    "POST",
    { email: "bob@example.test" },
    pro.token,
  );
  assert.equal(
    (
      await request(
        e,
        "/connections/" + co.data.id + "/respond",
        "POST",
        { accept: true, pool_id: id },
        coowner.token,
      )
    ).status,
    403,
  );
  await request(e, "/connections/" + second.data.id, "DELETE", {}, pro.token);
  assert.equal(
    (
      await request(
        e,
        "/connections/" + second.data.id + "/respond",
        "POST",
        { accept: true, pool_id: id },
        owner.token,
      )
    ).status,
    404,
  );
});
test("Client can reuse an existing dossier instead of the empty pool prepared by a professional", async () => {
  const e = context(),
    owner = await user(e, "alice"),
    pro = await user(e, "paul", "pro"),
    id = await pool(e, owner);
  const a = await request(
    e,
    "/pools/" + id + "/records",
    "POST",
    { kind: "analysis", measured_at: measured(), readings: { ph: 7.2 } },
    owner.token,
  );
  await request(
    e,
    "/records/" + a.data.id + "/publish",
    "POST",
    {},
    owner.token,
  );
  const created = await request(
    e,
    "/pools",
    "POST",
    { name: "Fiche préparée", mode: "pro", client_email: "alice@example.test" },
    pro.token,
  );
  const inv = (await request(e, "/invitations", "GET", undefined, owner.token))
    .data.items[0];
  const result = await request(
    e,
    "/invitations/" + inv.id + "/respond",
    "POST",
    { accept: true, existing_pool_id: id },
    owner.token,
  );
  assert.equal(result.status, 200, JSON.stringify(result.data));
  assert.equal(result.data.pool_id, id);
  assert.equal(
    (await request(e, "/pools/" + id + "/records", "GET", undefined, pro.token))
      .data.items[0].id,
    a.data.id,
  );
  assert.equal(
    (await request(e, "/pools?mode=pro", "GET", undefined, pro.token)).data
      .items.length,
    1,
  );
  assert.equal(
    (await request(e, "/pools/" + created.data.id, "GET", undefined, pro.token))
      .status,
    404,
  );
  assert.equal(
    (await request(e, "/pools?mode=client", "GET", undefined, owner.token)).data
      .items.length,
    1,
  );
});
test("Existing work on a prepared pool prevents silent merging or loss of history", async () => {
  const e = context(),
    owner = await user(e, "alice"),
    pro = await user(e, "paul", "pro"),
    id = await pool(e, owner);
  const p = await request(
    e,
    "/pools",
    "POST",
    {
      name: "Piscine préparée",
      mode: "pro",
      client_email: "alice@example.test",
    },
    pro.token,
  );
  const r = await request(
    e,
    "/pools/" + p.data.id + "/records",
    "POST",
    { kind: "visit", measured_at: measured(), readings: { ph: 7.3 } },
    pro.token,
  );
  assert.equal(r.status, 201);
  const inv = (await request(e, "/invitations", "GET", undefined, owner.token))
    .data.items[0];
  assert.equal(
    (
      await request(
        e,
        "/invitations/" + inv.id + "/respond",
        "POST",
        { accept: true, existing_pool_id: id },
        owner.token,
      )
    ).status,
    409,
  );
  assert.equal(
    (await request(e, "/pools/" + p.data.id, "GET", undefined, pro.token))
      .status,
    200,
  );
  assert.equal(
    (await request(e, "/pools/" + id, "GET", undefined, pro.token)).status,
    404,
  );
  assert.equal(
    (await request(e, "/invitations", "GET", undefined, owner.token)).data.items
      .length,
    1,
  );
});
test("Only one maintenance request is pending; acceptance is single-use and an archived claim expires", async () => {
  const e = context(),
    owner = await user(e, "alice"),
    pro = await user(e, "paul", "pro"),
    outsider = await user(e, "quentin", "pro"),
    id = await pool(e, owner);
  const a = await request(
    e,
    `/pools/${id}/intervenant`,
    "POST",
    { phone: "0612345678" },
    owner.token,
  );
  assert.equal(a.status, 201);
  assert.equal(
    (
      await request(
        e,
        `/pools/${id}/intervenant`,
        "POST",
        { phone: "0612345678" },
        owner.token,
      )
    ).status,
    409,
  );
  assert.equal(
    (
      await request(
        e,
        `/maintenance-requests/${a.data.id}/respond`,
        "POST",
        { accept: true },
        outsider.token,
      )
    ).status,
    403,
  );
  assert.equal(
    (
      await request(
        e,
        `/maintenance-requests/${a.data.id}/respond`,
        "POST",
        { accept: true },
        pro.token,
      )
    ).status,
    200,
  );
  assert.equal(
    (
      await request(
        e,
        `/maintenance-requests/${a.data.id}/respond`,
        "POST",
        { accept: true },
        pro.token,
      )
    ).status,
    404,
  );
  assert.equal(
    e.DB.db
      .prepare(
        "SELECT count(*) n FROM pool_members WHERE pool_id=? AND kind='principal' AND revoked_at IS NULL",
      )
      .get(id)!.n,
    1,
  );
  const prep = await request(
    e,
    "/pools",
    "POST",
    {
      name: "Fiche en attente",
      mode: "pro",
      client_email: "alice@example.test",
    },
    pro.token,
  );
  assert.equal(prep.status, 201);
  const claim = (
    await request(e, "/invitations", "GET", undefined, owner.token)
  ).data.items[0];
  await request(e, `/pools/${prep.data.id}/archive`, "POST", {}, pro.token);
  assert.equal(
    (
      await request(
        e,
        `/invitations/${claim.id}/respond`,
        "POST",
        { accept: true },
        owner.token,
      )
    ).status,
    404,
  );
});
test("Migration revokes legacy temporary access and schedules without deleting published history", async () => {
  const e = { ...context(), DB: new LocalD1("0002_guide_progress.sql") },
    identityMigration = e.DB.db.exec(
      readFileSync(
        new URL("../schema/0005_account_identity.sql", import.meta.url),
        "utf8",
      ),
    ),
    emailMigration = e.DB.db.exec(
      readFileSync(
        new URL("../schema/0006_email_login.sql", import.meta.url),
        "utf8",
      ),
    ),
    owner = await user(e, "alice"),
    pro = await user(e, "paul", "pro"),
    id = crypto.randomUUID();
  e.DB.db
    .prepare("INSERT INTO pools(id,name,created_by) VALUES(?,?,?)")
    .run(id, "Ancien bassin", owner.user.id);
  e.DB.db
    .prepare(
      "INSERT INTO pool_members(id,pool_id,user_id,kind,manager) VALUES(?,?,?,'owner',1)",
    )
    .run(crypto.randomUUID(), id, owner.user.id);
  e.DB.db
    .prepare(
      "INSERT INTO pool_members(id,pool_id,user_id,kind,expires_at) VALUES(?,?,?,'temporary','2099-01-01T00:00:00Z')",
    )
    .run(crypto.randomUUID(), id, pro.user.id);
  e.DB.db
    .prepare(
      "INSERT INTO schedules(id,pool_id,pro_id,start_date) VALUES('old-schedule',?,?, '2026-01-01')",
    )
    .run(id, pro.user.id);
  e.DB.db
    .prepare(
      "INSERT INTO records(id,pool_id,author_id,author_name,kind,measured_at,published_at) VALUES('old-report',?,?,'Paul','visit',?,?)",
    )
    .run(id, pro.user.id, measured(), measured());
  e.DB.db.exec(
    readFileSync(
      new URL("../schema/0003_single_professional.sql", import.meta.url),
      "utf8",
    ),
  );
  e.DB.db.exec(
    readFileSync(
      new URL("../schema/0004_maintenance_location.sql", import.meta.url),
      "utf8",
    ),
  );
  e.DB.db.exec(
    readFileSync(
      new URL("../schema/0007_business_provider.sql", import.meta.url),
      "utf8",
    ),
  );
  e.DB.db
    .prepare("UPDATE business_provider SET user_id=? WHERE singleton=1")
    .run(pro.user.id);
  e.DB.db.prepare("UPDATE users SET is_pro=1 WHERE id=?").run(pro.user.id);
  assert.equal(
    (await request(e, "/pools/" + id, "GET", undefined, pro.token)).status,
    404,
  );
  assert.equal(
    (await request(e, "/pools?mode=pro", "GET", undefined, pro.token)).data
      .items.length,
    0,
  );
  assert.equal(
    (await request(e, "/records/old-report", "GET", undefined, owner.token))
      .status,
    200,
  );
  assert.equal(
    e.DB.db
      .prepare("SELECT active FROM schedules WHERE id='old-schedule'")
      .get()!.active,
    0,
  );
  assert.throws(() =>
    e.DB.db
      .prepare(
        "INSERT INTO pool_members(id,pool_id,user_id,kind,expires_at) VALUES(?,?,?,'temporary','2099-01-01T00:00:00Z')",
      )
      .run(crypto.randomUUID(), id, pro.user.id),
  );
  await invite(e, owner, pro, id, "principal");
  assert.equal(
    (await request(e, "/pools/" + id, "GET", undefined, pro.token)).data
      .membership,
    "principal",
  );
});

test("Address suggestions create a private precise point and editing the address clears stale coordinates", async () => {
  const e = context(),
    owner = await user(e, "addressowner"),
    other = await user(e, "addressother", "pro");
  assert.equal((await request(e, "/addresses?q=Bandol")).status, 401);
  const suggestions = await request(
    e,
    "/addresses?q=12%20rue%20republique",
    "GET",
    undefined,
    owner.token,
  );
  assert.equal(suggestions.status, 200);
  assert.equal(suggestions.data.items[0].city_code, "83009");
  assert.equal(
    (
      await request(
        e,
        "/addresses?q=indisponible",
        "GET",
        undefined,
        owner.token,
      )
    ).status,
    503,
  );
  const created = await request(
    e,
    "/pools",
    "POST",
    { name: "Bassin localisé", location: suggestions.data.items[0] },
    owner.token,
  );
  assert.equal(created.status, 201, JSON.stringify(created.data));
  let p = (
    await request(e, "/pools/" + created.data.id, "GET", undefined, owner.token)
  ).data;
  assert.equal(p.longitude, 5.7523);
  assert.equal(p.latitude, 43.1369);
  assert.equal(p.location_precision, "address");
  assert.equal(p.treatment, "unknown");
  assert.equal(p.volume, null);
  assert.equal(
    (await request(e, "/pools/" + p.id, "GET", undefined, other.token)).status,
    404,
  );
  assert.equal(
    (await request(e, "/pools?mode=pro", "GET", undefined, other.token)).data
      .items.length,
    0,
  );
  const invalid = await request(
    e,
    "/pools",
    "POST",
    {
      name: "Invalid",
      location: { ...suggestions.data.items[0], latitude: 100 },
    },
    owner.token,
  );
  assert.equal(invalid.status, 400);
  assert.equal(
    (
      await request(
        e,
        "/pools/" + p.id,
        "PUT",
        { name: p.name, address: "Une autre adresse" },
        owner.token,
      )
    ).status,
    200,
  );
  p = (await request(e, "/pools/" + p.id, "GET", undefined, owner.token)).data;
  assert.equal(p.latitude, null);
  assert.equal(p.longitude, null);
  assert.equal(p.location_precision, "none");
});

test("Maintenance follows equipment, requires truthful task states and shares only the completed snapshot", async () => {
  const e = context(),
    owner = await user(e, "careowner"),
    pro = await user(e, "carepro", "pro"),
    id = await pool(e, owner);
  await invite(e, owner, pro, id, "principal");
  assert.equal(
    (
      await request(
        e,
        "/pools/" + id,
        "PUT",
        {
          name: "Mon bassin",
          treatment: "chlorine",
          filter_type: "glass",
          has_steps: false,
          has_prefilter: false,
          has_skimmers: true,
        },
        owner.token,
      )
    ).status,
    200,
  );
  let p = (await request(e, "/pools/" + id, "GET", undefined, pro.token)).data;
  let ids = p.maintenance_tasks.map((t: any) => t.id);
  for (const key of [
    "level",
    "algae",
    "waterline",
    "surface",
    "floor",
    "walls",
    "skimmers",
    "analysis",
    "backwash",
    "rinse",
    "tablets",
  ])
    assert.ok(ids.includes(key), key);
  for (const key of ["steps", "prefilter", "cartridge", "electrolyser"])
    assert.ok(!ids.includes(key), key);
  const created = await request(
    e,
    "/pools/" + id + "/records",
    "POST",
    { kind: "visit", measured_at: measured() },
    pro.token,
  );
  assert.equal(created.status, 201);
  const rid = created.data.id;
  assert.equal(
    (await request(e, "/records/" + rid + "/publish", "POST", {}, pro.token))
      .status,
    400,
  );
  assert.equal(
    (await request(e, "/records/" + rid, "GET", undefined, owner.token)).status,
    404,
  );
  let r = (await request(e, "/records/" + rid, "GET", undefined, pro.token))
    .data;
  const save = async (list: any[], values: any) => {
    const v = await request(
      e,
      "/records/" + rid,
      "PUT",
      { ...r, checklist: list, readings: values, revision: r.revision },
      pro.token,
    );
    assert.equal(v.status, 200, JSON.stringify(v.data));
    r = (await request(e, "/records/" + rid, "GET", undefined, pro.token)).data;
  };
  await save(
    r.checklist.map((t: any) => ({
      ...t,
      done: true,
      label: "Un libellé falsifié",
    })),
    { ph: 7.2 },
  );
  assert.equal(
    (await request(e, "/records/" + rid + "/publish", "POST", {}, pro.token))
      .status,
    400,
  );
  assert.notEqual(r.checklist[0].label, "Un libellé falsifié");
  await save(
    r.checklist.map((t: any) => ({
      ...t,
      done: t.id !== "rinse",
      skipped: t.id === "rinse",
      reason: t.id === "rinse" ? "Oublié" : "",
    })),
    { ph: 7.2, chlorine: 1.4 },
  );
  assert.equal(
    (await request(e, "/records/" + rid + "/publish", "POST", {}, pro.token))
      .status,
    400,
  );
  await save(
    r.checklist.map((t: any) => ({
      ...t,
      done: !["backwash", "rinse"].includes(t.id),
      skipped: ["backwash", "rinse"].includes(t.id),
      reason: "",
    })),
    { ph: 7.2, chlorine: 1.4 },
  );
  assert.equal(
    (await request(e, "/records/" + rid + "/publish", "POST", {}, pro.token))
      .status,
    400,
  );
  await save(
    r.checklist.map((t: any) => ({
      ...t,
      reason: t.skipped ? "Filtre propre, lavage non nécessaire" : "",
    })),
    { ph: 7.2, chlorine: 1.4 },
  );
  assert.equal(
    (await request(e, "/records/" + rid + "/publish", "POST", {}, pro.token))
      .status,
    200,
  );
  const client = (
    await request(e, "/records/" + rid, "GET", undefined, owner.token)
  ).data;
  assert.equal(client.checklist.filter((t: any) => t.skipped).length, 2);
  assert.ok(client.checklist.find((t: any) => t.id === "waterline").done);
  assert.equal(
    (
      await request(
        e,
        "/pools/" + id,
        "PUT",
        {
          name: "Mon bassin",
          treatment: "salt",
          filter_type: "cartridge",
          has_steps: true,
          has_prefilter: true,
        },
        owner.token,
      )
    ).status,
    200,
  );
  p = (await request(e, "/pools/" + id, "GET", undefined, pro.token)).data;
  ids = p.maintenance_tasks.map((t: any) => t.id);
  for (const key of ["electrolyser", "cartridge", "steps", "prefilter"])
    assert.ok(ids.includes(key), key);
  for (const key of ["tablets", "backwash", "rinse"])
    assert.ok(!ids.includes(key), key);
  assert.deepEqual(
    (await request(e, "/records/" + rid, "GET", undefined, owner.token)).data
      .checklist,
    client.checklist,
  );
  const correction = await request(
    e,
    "/pools/" + id + "/records",
    "POST",
    { ...client, id: crypto.randomUUID(), correction_of: rid },
    pro.token,
  );
  assert.equal(correction.status, 201, JSON.stringify(correction.data));
  assert.ok(
    (
      await request(
        e,
        "/records/" + correction.data.id,
        "GET",
        undefined,
        pro.token,
      )
    ).data.checklist.some((t: any) => t.id === "backwash"),
  );
});

test("New analyses only accept pH and chlorine while historical readings remain stored", async () => {
  const e = context(),
    owner = await user(e, "measureowner"),
    id = await pool(e, owner);
  assert.equal(
    (
      await request(
        e,
        "/pools/" + id + "/records",
        "POST",
        {
          kind: "analysis",
          measured_at: measured(),
          readings: { ph: 7.2, salt: 4 },
        },
        owner.token,
      )
    ).status,
    400,
  );
  const r = await request(
    e,
    "/pools/" + id + "/records",
    "POST",
    {
      kind: "analysis",
      measured_at: measured(),
      readings: { ph: 7.2, chlorine: 0 },
    },
    owner.token,
  );
  assert.equal(r.status, 201);
  assert.equal(
    (
      await request(
        e,
        "/records/" + r.data.id + "/publish",
        "POST",
        {},
        owner.token,
      )
    ).status,
    200,
  );
  e.DB.db
    .prepare("UPDATE records SET readings=? WHERE id=?")
    .run(JSON.stringify({ ph: 7.2, chlorine: 0, salt: 4 }), r.data.id);
  const raw = (
    await request(e, "/records/" + r.data.id, "GET", undefined, owner.token)
  ).data;
  assert.equal(raw.readings.salt, 4);
  const trend = (
    await request(e, "/pools/" + id + "/trends", "GET", undefined, owner.token)
  ).data.items[0];
  assert.equal(trend.chlorine, 0);
  assert.equal(trend.salt, undefined);
});

test("Email is the sole login, is unique without case differences, and changes require the current password", async () => {
  const e = context(),
    a = await user(e, "accountowner"),
    other = await user(e, "otheremail");
  const simple = await request(e, "/auth/signup", "POST", {
    email: "simple@example.test",
    password: "Just email and password!",
  });
  assert.equal(simple.status, 201);
  assert.equal(simple.data.user.is_pro, 0);
  const me = (await request(e, "/me", "GET", undefined, a.token)).data;
  assert.equal(me.email, "accountowner@example.test");
  for (const key of ["username", "first_name", "last_name"])
    assert.equal(me[key], undefined);
  const duplicate = await request(e, "/auth/signup", "POST", {
    email: "ACCOUNTOWNER@EXAMPLE.TEST",
    password: "Long password fixture!",
    role: "pro",
  });
  assert.equal(duplicate.status, 409);
  assert.equal(
    (
      await request(e, "/auth/login", "POST", {
        username: "accountowner",
        password: "Test account long password 2026!",
      })
    ).status,
    400,
  );
  const session = await request(e, "/auth/login", "POST", {
    email: "ACCOUNTOWNER@EXAMPLE.TEST",
    password: "Test account long password 2026!",
  });
  assert.equal(session.status, 200);
  assert.equal(
    (
      await request(
        e,
        "/me",
        "PUT",
        { email: a.user.email, enable_pro: true },
        a.token,
      )
    ).status,
    403,
  );
  assert.equal(
    (await request(e, "/me", "PUT", { email: "new@example.test" }, a.token))
      .status,
    400,
  );
  assert.equal(
    (
      await request(
        e,
        "/me",
        "PUT",
        { email: "new@example.test", current_password: "Wrong password long!" },
        a.token,
      )
    ).status,
    401,
  );
  assert.equal(
    (
      await request(
        e,
        "/me",
        "PUT",
        {
          email: other.user.email,
          current_password: "Test account long password 2026!",
        },
        a.token,
      )
    ).status,
    409,
  );
  const changed = await request(
    e,
    "/me",
    "PUT",
    {
      email: "New@Example.Test",
      current_password: "Test account long password 2026!",
    },
    a.token,
  );
  assert.equal(changed.status, 200);
  assert.equal(changed.data.email, "new@example.test");
  assert.equal(
    (await request(e, "/me", "GET", undefined, session.token)).status,
    401,
  );
  assert.equal(
    (
      await request(e, "/auth/login", "POST", {
        email: "accountowner@example.test",
        password: "Test account long password 2026!",
      })
    ).status,
    401,
  );
  assert.equal(
    (
      await request(e, "/auth/login", "POST", {
        email: "new@example.test",
        password: "Test account long password 2026!",
      })
    ).status,
    200,
  );
  assert.equal(
    (
      await request(
        e,
        "/professionals?q=account",
        "GET",
        undefined,
        other.token,
      )
    ).status,
    404,
  );
});

test("Email migration preserves legacy accounts, avoids ambiguous duplicates, and recovery attaches only the account proved by its code", async () => {
  const e = { ...context(), DB: new LocalD1("0005_account_identity.sql") };
  const insert = e.DB.db.prepare(
    "INSERT INTO users(id,username,name,password_hash,recovery_hash,email) VALUES(?,?,?,'unused',?,?)",
  );
  insert.run("one", "one", "Ancien nom", "unused1", "  ONE@EXAMPLE.TEST ");
  insert.run("two", "two", "Second nom", "unused2", "same@example.test");
  insert.run("three", "three", "Troisième nom", "unused3", "SAME@example.test");
  insert.run("four", "four", "Sans email", "unused4", null);
  e.DB.db.exec(
    readFileSync(
      new URL("../schema/0006_email_login.sql", import.meta.url),
      "utf8",
    ),
  );
  const values = e.DB.db
    .prepare("SELECT id,login_email FROM users ORDER BY id")
    .all();
  assert.equal(values.length, 4);
  assert.equal(
    values.find((x: any) => x.id === "one")?.login_email,
    "one@example.test",
  );
  for (const id of ["two", "three", "four"])
    assert.equal(values.find((x: any) => x.id === id)?.login_email, null);
  e.DB.db.exec(
    readFileSync(
      new URL("../schema/0007_business_provider.sql", import.meta.url),
      "utf8",
    ),
  );
  const legacy = await user(e, "legacycode");
  e.DB.db
    .prepare("UPDATE users SET email=NULL,login_email=NULL WHERE id=?")
    .run(legacy.user.id);
  const recovered = await request(e, "/auth/recover", "POST", {
    email: "attached@example.test",
    code: legacy.recovery_code,
    password: "New password very long!",
  });
  assert.equal(recovered.status, 200);
  assert.equal(recovered.data.user.id, legacy.user.id);
  assert.equal(recovered.data.user.email, "attached@example.test");
  assert.equal(
    (await request(e, "/me", "GET", undefined, legacy.token)).status,
    401,
  );
  assert.equal(
    (
      await request(e, "/auth/recover", "POST", {
        email: "different@example.test",
        code: recovered.data.recovery_code,
        password: "Another password very long!",
      })
    ).status,
    401,
  );
  assert.equal(
    (
      await request(e, "/auth/login", "POST", {
        email: "attached@example.test",
        password: "New password very long!",
      })
    ).status,
    200,
  );
});

test("Client remains autonomous while professional preparation is restricted to the current principal", async () => {
  const e = context(),
    owner = await user(e, "autonomous"),
    pro = await user(e, "assignedpro", "pro"),
    other = await user(e, "unassignedpro", "pro"),
    id = await pool(e, owner);
  assert.equal(
    (await request(e, "/pools/" + id + "/needs", "GET", undefined, owner.token))
      .status,
    403,
  );
  assert.equal(
    (
      await request(
        e,
        "/pools/" + id + "/needs",
        "POST",
        { title: "Private prep", responsible: "pro" },
        owner.token,
      )
    ).status,
    403,
  );
  const analysis = await request(
    e,
    "/pools/" + id + "/records",
    "POST",
    {
      kind: "analysis",
      measured_at: measured(),
      readings: { ph: 7.2, chlorine: 1.3 },
    },
    owner.token,
  );
  assert.equal(analysis.status, 201);
  assert.equal(
    (
      await request(
        e,
        "/records/" + analysis.data.id + "/publish",
        "POST",
        {},
        owner.token,
      )
    ).status,
    200,
  );
  await invite(e, owner, pro, id, "principal");
  const p = (await request(e, "/pools/" + id, "GET", undefined, pro.token))
    .data;
  assert.equal(
    (
      await request(
        e,
        "/pools/" + id,
        "PUT",
        {
          ...p,
          name: p.name,
          routine: "Instruction pro",
          client_advice: "Surveiller la ligne d’eau",
        },
        pro.token,
      )
    ).status,
    200,
  );
  const clientPool = (
    await request(e, "/pools/" + id, "GET", undefined, owner.token)
  ).data;
  assert.equal(clientPool.maintenance_tasks, undefined);
  assert.equal(clientPool.routine, undefined);
  assert.equal(clientPool.client_advice, "Surveiller la ligne d’eau");
  assert.equal(
    (
      await request(
        e,
        "/pools/" + id,
        "PUT",
        { ...clientPool, name: "Bassin autonome", volume: 42 },
        owner.token,
      )
    ).status,
    403,
  ); // professional advice is not client-editable
  delete clientPool.client_advice;
  assert.equal(
    (
      await request(
        e,
        "/pools/" + id,
        "PUT",
        { ...clientPool, name: "Bassin autonome", volume: 42 },
        owner.token,
      )
    ).status,
    200,
  );
  assert.equal(
    (await request(e, "/pools/" + id, "GET", undefined, pro.token)).data
      .routine,
    "Instruction pro",
  );
  const need = await request(
    e,
    "/pools/" + id + "/needs",
    "POST",
    { title: "Produit", responsible: "client" },
    pro.token,
  );
  assert.equal(need.status, 201);
  assert.equal(
    (
      await request(
        e,
        "/needs/" + need.data.id,
        "PUT",
        { status: "ready", revision: 1 },
        owner.token,
      )
    ).status,
    403,
  );
  assert.equal(
    (
      await request(
        e,
        "/needs/" + need.data.id,
        "PUT",
        { status: "ready", revision: 1 },
        other.token,
      )
    ).status,
    404,
  );
  assert.equal(
    (
      await request(
        e,
        "/needs/" + need.data.id,
        "PUT",
        { status: "ready", revision: 1 },
        pro.token,
      )
    ).status,
    200,
  );
  assert.ok(
    (
      await request(e, "/notifications", "GET", undefined, owner.token)
    ).data.items.some((n: any) => n.type === "supply"),
  );
});

test("Email invitations grant the selected role only, after acceptance", async () => {
  const e = context(),
    manager = await user(e, "mailowner"),
    co = await user(e, "mailco"),
    pro = await user(e, "mailpro", "pro"),
    id = await pool(e, manager);
  const invitation = await request(
    e,
    `/pools/${id}/invitations`,
    "POST",
    { email: "MAILCO@EXAMPLE.TEST", kind: "owner" },
    manager.token,
  );
  assert.equal(invitation.status, 201);
  assert.equal(
    (await request(e, `/pools/${id}`, "GET", undefined, co.token)).status,
    404,
  );
  assert.equal(
    (
      await request(
        e,
        `/invitations/${invitation.data.id}/respond`,
        "POST",
        { accept: true },
        co.token,
      )
    ).status,
    200,
  );
  const own = (await request(e, `/pools/${id}`, "GET", undefined, co.token))
    .data;
  assert.equal(own.membership, "owner");
  assert.equal(own.manager, 0);
  assert.equal(
    (
      await request(
        e,
        `/pools/${id}`,
        "PUT",
        { ...own, name: "Bassin partagé", client_advice: undefined },
        co.token,
      )
    ).status,
    200,
  );
  assert.equal(
    (
      await request(
        e,
        `/pools/${id}/records`,
        "POST",
        { kind: "analysis", measured_at: measured(), readings: { ph: 7.3 } },
        co.token,
      )
    ).status,
    201,
  );
  for (const path of [`/pools/${id}/needs`, `/pools/${id}/notes`])
    assert.equal(
      (await request(e, path, "GET", undefined, co.token)).status,
      403,
    );
  assert.equal(
    (
      await request(
        e,
        `/pools/${id}/records`,
        "POST",
        { kind: "visit", measured_at: measured() },
        co.token,
      )
    ).status,
    403,
  );
  assert.equal(
    (
      await request(
        e,
        `/pools/${id}/invitations`,
        "POST",
        { kind: "principal", email: pro.user.email },
        co.token,
      )
    ).status,
    403,
  );
  assert.equal(
    (
      await request(
        e,
        `/pools/${id}/invitations`,
        "POST",
        { kind: "principal", email: co.user.email },
        manager.token,
      )
    ).status,
    403,
  );
  await invite(e, manager, pro, id, "principal");
  const professional = (
    await request(e, `/pools/${id}`, "GET", undefined, pro.token)
  ).data;
  assert.equal(professional.membership, "principal");
  assert.ok(professional.maintenance_tasks.length > 10);
  assert.equal(
    (await request(e, `/pools?mode=pro`, "GET", undefined, pro.token)).data
      .items[0].id,
    id,
  );
  assert.equal(
    (await request(e, `/pools/${id}/needs`, "GET", undefined, pro.token))
      .status,
    200,
  );
  const member = professional.members.find(
    (m: any) => m.user_id === pro.user.id,
  );
  await request(
    e,
    `/pools/${id}/members/${member.id}`,
    "DELETE",
    {},
    manager.token,
  );
  assert.equal(
    (await request(e, `/pools/${id}/overview`, "GET", undefined, pro.token))
      .status,
    404,
  );
  assert.equal(
    (await request(e, `/pools/${id}/overview`, "GET", undefined, co.token))
      .status,
    200,
  );
});

test("Dashboard keeps latest readings and published professional photos aligned without leaking drafts", async () => {
  const e = context(),
    owner = await user(e, "photoowner"),
    pro = await user(e, "photopro", "pro"),
    outsider = await user(e, "photooutsider"),
    id = await pool(e, owner);
  await invite(e, owner, pro, id, "principal");
  const visit = await request(
    e,
    `/pools/${id}/records`,
    "POST",
    { kind: "visit", measured_at: new Date(Date.now() - 60000).toISOString() },
    pro.token,
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
    `/records/${visit.data.id}/photos`,
    "POST",
    fd,
    pro.token,
  );
  assert.equal(photo.status, 201);
  let overview = (
    await request(e, `/pools/${id}/overview`, "GET", undefined, owner.token)
  ).data;
  assert.equal(overview.last_photo, null);
  assert.equal(overview.last_visit, null);
  await completeVisit(e, visit.data.id, pro.token);
  await request(e, `/records/${visit.data.id}/publish`, "POST", {}, pro.token);
  // More than a history page of partial personal readings must not hide the last chlorine result or photo.
  for (let i = 0; i < 26; i++) {
    const analysis = await request(
      e,
      `/pools/${id}/records`,
      "POST",
      {
        kind: "analysis",
        measured_at: new Date(Date.now() - 1000 - i * 1000).toISOString(),
        readings: { ph: 7.4 },
      },
      owner.token,
    );
    assert.equal(analysis.status, 201);
    await request(
      e,
      `/records/${analysis.data.id}/publish`,
      "POST",
      {},
      owner.token,
    );
  }
  overview = (
    await request(e, `/pools/${id}/overview`, "GET", undefined, owner.token)
  ).data;
  assert.equal(overview.last_photo.id, photo.data.id);
  assert.equal(overview.last_photo.record_id, visit.data.id);
  assert.equal(overview.last_visit.id, visit.data.id);
  assert.equal(overview.measurements.ph.value, 7.4);
  assert.equal(overview.measurements.chlorine.value, 1.5);
  assert.equal(overview.measurements.chlorine.record_id, visit.data.id);
  assert.notEqual(
    overview.measurements.ph.measured_at,
    overview.last_photo.measured_at,
  );
  assert.equal(
    (
      await request(
        e,
        `/pools/${id}/overview`,
        "GET",
        undefined,
        outsider.token,
      )
    ).status,
    404,
  );
  const membership = (
    await request(e, `/pools/${id}`, "GET", undefined, owner.token)
  ).data.members.find((m: any) => m.user_id === pro.user.id);
  await request(
    e,
    `/pools/${id}/members/${membership.id}`,
    "DELETE",
    {},
    owner.token,
  );
  assert.equal(
    (await request(e, `/pools/${id}/overview`, "GET", undefined, pro.token))
      .status,
    404,
  );
  assert.equal(
    (await request(e, `/photos/${photo.data.id}`, "GET", undefined, pro.token))
      .status,
    404,
  );
  assert.equal(
    (
      await request(
        e,
        `/photos/${photo.data.id}`,
        "GET",
        undefined,
        owner.token,
      )
    ).status,
    200,
  );
});

test("Filter tasks require backwash and rinse for sand/glass while cartridge maintenance stays distinct", () => {
  for (const filter_type of ["sand", "glass"]) {
    const tasks = maintenanceTasks({ filter_type });
    assert.equal(
      tasks.find((t) => t.id === "backwash")?.label,
      "Effectuer le lavage du filtre",
    );
    assert.ok(tasks.some((t) => t.id === "rinse"));
    assert.ok(!tasks.some((t) => t.id === "cartridge"));
  }
  const cartridge = maintenanceTasks({ filter_type: "cartridge" });
  assert.ok(
    cartridge.some(
      (t) => t.id === "cartridge" && t.label.includes("si nécessaire"),
    ),
  );
  assert.ok(!cartridge.some((t) => ["backwash", "rinse"].includes(t.id)));
});

test("Recurrence edits update future occurrences, preserve completed reports and deny other accounts", async () => {
  const e = context(),
    owner = await user(e, "schedule-owner"),
    pro = await user(e, "schedule-pro", "pro"),
    outsider = await user(e, "schedule-other", "pro"),
    id = await pool(e, owner);
  await invite(e, owner, pro, id, "principal");
  const body = {
    title: "Entretien régulier",
    start_date: "2026-10-01",
    interval_days: 7,
    time: "09:00",
    duration: 45,
    seasons: [],
  };
  const created = await request(
    e,
    "/pools/" + id + "/schedules",
    "POST",
    body,
    pro.token,
  );
  assert.equal(created.status, 201);
  const sid = created.data.id;
  const occurrence = await request(
    e,
    "/schedules/" + sid + "/occurrence",
    "POST",
    { date: body.start_date },
    pro.token,
  );
  const record = await request(
    e,
    "/pools/" + id + "/records",
    "POST",
    {
      kind: "visit",
      measured_at: "2026-10-01T09:00:00Z",
      appointment_id: occurrence.data.id,
    },
    pro.token,
  );
  await completeVisit(e, record.data.id, pro.token);
  assert.equal(
    (
      await request(
        e,
        "/records/" + record.data.id + "/publish",
        "POST",
        {},
        pro.token,
      )
    ).status,
    200,
  );
  const changed = { ...body, time: "11:15", interval_days: 14 };
  assert.equal(
    (await request(e, "/schedules/" + sid, "PUT", changed, owner.token)).status,
    404,
  );
  assert.equal(
    (await request(e, "/schedules/" + sid, "PUT", changed, outsider.token))
      .status,
    404,
  );
  assert.equal(
    (await request(e, "/schedules/" + sid, "PUT", changed, pro.token)).status,
    200,
  );
  const upcoming = await request(
    e,
    "/planning?from=2026-10-01&to=2026-10-30",
    "GET",
    undefined,
    pro.token,
  );
  const virtual = upcoming.data.items.filter((a: any) => a.virtual);
  assert.deepEqual(
    virtual.map((a: any) => a.date),
    ["2026-10-15", "2026-10-29"],
  );
  assert.ok(virtual.every((a: any) => a.time === "11:15"));
  assert.equal(
    upcoming.data.items.find((a: any) => a.id === occurrence.data.id).status,
    "done",
  );
  assert.equal(
    (
      await request(
        e,
        "/records/" + record.data.id,
        "GET",
        undefined,
        owner.token,
      )
    ).data.readings.ph,
    7.2,
  );
});

test("Public signup never grants professional rights, even with a forged role or the business email", async () => {
  const e = context();
  for (const email of ["romainfalanga83@gmail.com", "otherpro@example.test"]) {
    const r = await request(e, "/auth/signup", "POST", {
      email,
      password: "Long fixture password only!",
      role: "pro",
      is_pro: 1,
      is_admin: true,
    });
    assert.equal(r.status, 201);
    assert.equal(r.data.user.is_pro, 0);
    for (const path of ["/business-summary", "/activity-summary", "/guides"])
      assert.equal(
        (await request(e, path, "GET", undefined, r.token)).status,
        403,
      );
  }
  assert.equal(
    e.DB.db.prepare("SELECT user_id FROM business_provider").get()!.user_id,
    null,
  );
  assert.throws(() =>
    e.DB.db
      .prepare(
        "UPDATE users SET is_pro=1 WHERE login_email='romainfalanga83@gmail.com'",
      )
      .run(),
  );
});

test("Regular maintenance requires a mobile, preserves private dossiers until acceptance and counts distinct clients", async () => {
  const e = context(),
    admin = await user(e, "business", "pro"),
    owner = await user(e, "owner"),
    co = await user(e, "co"),
    autonomous = await user(e, "autonomous"),
    blank = await user(e, "blank"),
    id = await pool(e, owner);
  await invite(e, owner, co, id, "owner");
  await pool(e, autonomous);
  for (const phone of ["", "hello", "0412345678", "+33412345678", "06123"])
    assert.equal(
      (
        await request(
          e,
          `/pools/${id}/intervenant`,
          "POST",
          { phone },
          owner.token,
        )
      ).status,
      400,
    );
  assert.equal(
    (
      await request(
        e,
        `/pools/${id}/intervenant`,
        "POST",
        { phone: "0612345678" },
        co.token,
      )
    ).status,
    403,
  );
  assert.equal(
    (
      await request(
        e,
        `/pools/${id}/intervenant`,
        "GET",
        undefined,
        autonomous.token,
      )
    ).status,
    404,
  );
  const demand = await request(
    e,
    `/pools/${id}/intervenant`,
    "POST",
    { phone: "06 12 34 56 78" },
    owner.token,
  );
  assert.equal(demand.status, 201);
  assert.equal(
    (await request(e, `/pools/${id}`, "GET", undefined, admin.token)).status,
    404,
  );
  const b = (
    await request(e, "/business-summary", "GET", undefined, admin.token)
  ).data;
  assert.equal(b.platform_accounts, 4);
  assert.equal(b.pool_owners, 3);
  assert.equal(b.maintenance_clients, 0);
  assert.equal(b.pending_requests, 1);
  assert.equal(b.requests.items[0].phone, "+33612345678");
  assert.equal(b.requests.items[0].address, undefined);
  assert.equal(b.requests.items[0].pool_id, undefined);
  assert.equal(
    (await request(e, `/pools/${id}/intervenant`, "GET", undefined, co.token))
      .data.request.phone,
    null,
  );
  const notices = (
    await request(e, "/notifications", "GET", undefined, admin.token)
  ).data.items;
  assert.equal(
    notices.filter((n: any) => n.type === "maintenance-request").length,
    1,
  );
  assert.equal(
    (
      await request(
        e,
        `/maintenance-requests/${demand.data.id}/respond`,
        "POST",
        { accept: true },
        admin.token,
      )
    ).status,
    200,
  );
  assert.equal(
    (await request(e, `/pools/${id}`, "GET", undefined, admin.token)).status,
    200,
  );
  assert.equal(
    (await request(e, "/business-summary", "GET", undefined, admin.token)).data
      .maintenance_clients,
    2,
  );
  const second = await pool(e, owner, "Deuxième piscine");
  await invite(e, owner, admin, second, "principal");
  const summary = (
    await request(e, "/business-summary", "GET", undefined, admin.token)
  ).data;
  assert.equal(summary.maintenance_clients, 2);
  assert.equal(summary.followed_pools, 2);
  const p = (await request(e, `/pools/${id}`, "GET", undefined, owner.token))
    .data;
  const membership = p.members.find((m: any) => m.kind === "principal");
  assert.equal(
    (
      await request(
        e,
        `/pools/${id}/members/${membership.id}`,
        "DELETE",
        {},
        owner.token,
      )
    ).status,
    200,
  );
  assert.equal(
    (await request(e, `/pools/${id}`, "GET", undefined, admin.token)).status,
    404,
  );
  assert.equal(
    (await request(e, "/business-summary", "GET", undefined, admin.token)).data
      .maintenance_clients,
    1,
  );
  assert.equal(
    (
      await request(
        e,
        "/me",
        "PUT",
        {
          email: "changed@example.test",
          current_password: "Test account long password 2026!",
        },
        admin.token,
      )
    ).status,
    403,
  );
});

test("Cancelled, declined, archived and transferred maintenance consent cannot be reused", async () => {
  const e = context(),
    admin = await user(e, "business", "pro"),
    owner = await user(e, "owner"),
    co = await user(e, "co"),
    id = await pool(e, owner);
  await invite(e, owner, co, id, "owner");
  const demand = async () => {
    const r = await request(
      e,
      `/pools/${id}/intervenant`,
      "POST",
      { phone: "0712345678" },
      owner.token,
    );
    assert.equal(r.status, 201, JSON.stringify(r.data));
    return r.data.id;
  };
  const first = await demand();
  assert.equal(
    (
      await request(
        e,
        `/pools/${id}/intervenant/${first}`,
        "DELETE",
        {},
        owner.token,
      )
    ).status,
    200,
  );
  assert.equal(
    (
      await request(
        e,
        `/maintenance-requests/${first}/respond`,
        "POST",
        { accept: true },
        admin.token,
      )
    ).status,
    404,
  );
  const second = await demand();
  assert.equal(
    (
      await request(
        e,
        `/maintenance-requests/${second}/respond`,
        "POST",
        { accept: false },
        admin.token,
      )
    ).status,
    200,
  );
  assert.equal(
    (await request(e, `/pools/${id}`, "GET", undefined, admin.token)).status,
    404,
  );
  const third = await demand();
  const p = (await request(e, `/pools/${id}`, "GET", undefined, owner.token))
    .data;
  const coMember = p.members.find((m: any) => m.user_id === co.user.id);
  assert.equal(
    (
      await request(
        e,
        `/pools/${id}/manager`,
        "POST",
        { member_id: coMember.id },
        owner.token,
      )
    ).status,
    200,
  );
  assert.equal(
    (
      await request(
        e,
        `/maintenance-requests/${third}/respond`,
        "POST",
        { accept: true },
        admin.token,
      )
    ).status,
    404,
  );
  assert.equal(
    (await request(e, "/business-summary", "GET", undefined, admin.token)).data
      .pending_requests,
    0,
  );
  const next = await request(
    e,
    `/pools/${id}/intervenant`,
    "POST",
    { phone: "+33712345678" },
    co.token,
  );
  assert.equal(next.status, 201);
  e.DB.db
    .prepare("UPDATE pools SET archived_at=? WHERE id=?")
    .run(measured(), id);
  assert.equal(
    (
      await request(
        e,
        `/maintenance-requests/${next.data.id}/respond`,
        "POST",
        { accept: true },
        admin.token,
      )
    ).status,
    404,
  );
});

test("Business migration pins only the pre-existing designated account and revokes all other professionals without deleting reports", async () => {
  const e = { ...context(), DB: new LocalD1("0006_email_login.sql") },
    adminId = "bcb167e4-2ddc-45c1-816a-82e7008904af";
  e.DB.db
    .prepare(
      "INSERT INTO users(id,username,name,password_hash,recovery_hash,is_pro,email,login_email) VALUES(?,?,?,'unused','unused',1,?,?)",
    )
    .run(
      adminId,
      adminId,
      "Romain",
      "romainfalanga83@gmail.com",
      "romainfalanga83@gmail.com",
    );
  const owner = await user(e, "owner"),
    former = await user(e, "former");
  e.DB.db.prepare("UPDATE users SET is_pro=1 WHERE id=?").run(former.user.id);
  const id = crypto.randomUUID();
  e.DB.db
    .prepare(
      "INSERT INTO pools(id,name,created_by) VALUES(?,'Bassin existant',?)",
    )
    .run(id, owner.user.id);
  e.DB.db
    .prepare(
      "INSERT INTO pool_members(id,pool_id,user_id,kind,manager) VALUES('owner',?,?,'owner',1)",
    )
    .run(id, owner.user.id);
  e.DB.db
    .prepare(
      "INSERT INTO pool_members(id,pool_id,user_id,kind) VALUES('former',?,?,'principal')",
    )
    .run(id, former.user.id);
  e.DB.db
    .prepare(
      "INSERT INTO schedules(id,pool_id,pro_id,start_date) VALUES('old',?,?,'2026-01-01')",
    )
    .run(id, former.user.id);
  e.DB.db
    .prepare(
      "INSERT INTO records(id,pool_id,author_id,author_name,kind,measured_at,published_at) VALUES('kept',?,?,'Ancien intervenant','visit',?,?)",
    )
    .run(id, former.user.id, measured(), measured());
  e.DB.db.exec(
    readFileSync(
      new URL("../schema/0007_business_provider.sql", import.meta.url),
      "utf8",
    ),
  );
  assert.equal(
    e.DB.db.prepare("SELECT user_id FROM business_provider").get()!.user_id,
    adminId,
  );
  assert.equal(
    e.DB.db.prepare("SELECT count(*) n FROM users WHERE is_pro=1").get()!.n,
    1,
  );
  assert.equal(
    e.DB.db.prepare("SELECT active FROM schedules WHERE id='old'").get()!
      .active,
    0,
  );
  assert.equal(
    (await request(e, `/pools/${id}`, "GET", undefined, former.token)).status,
    404,
  );
  assert.equal(
    (await request(e, "/records/kept", "GET", undefined, owner.token)).status,
    200,
  );
  assert.equal(
    (await request(e, "/business-summary", "GET", undefined, former.token))
      .status,
    403,
  );
});

test("Maintenance queue pagination stays stable after resolution and fixture deletion removes its notification", async () => {
  const e = context(),
    admin = await user(e, "business", "pro"),
    owner = await user(e, "owner");
  const ids: string[] = [];
  for (let i = 0; i < 3; i++) {
    const id = await pool(e, owner, "Piscine " + i);
    const r = await request(
      e,
      `/pools/${id}/intervenant`,
      "POST",
      { phone: "0612345678" },
      owner.token,
    );
    assert.equal(r.status, 201);
    ids.push(r.data.id);
  }
  const first = (
    await request(e, "/business-summary?limit=1", "GET", undefined, admin.token)
  ).data;
  assert.equal(first.pending_requests, 3);
  assert.equal(first.requests.items.length, 1);
  assert.ok(first.requests.next);
  assert.equal(
    (
      await request(
        e,
        `/maintenance-requests/${first.requests.items[0].id}/respond`,
        "POST",
        { accept: false },
        admin.token,
      )
    ).status,
    200,
  );
  const second = (
    await request(
      e,
      "/business-summary?limit=1&cursor=" +
        encodeURIComponent(first.requests.next),
      "GET",
      undefined,
      admin.token,
    )
  ).data;
  assert.equal(second.requests.items.length, 1);
  assert.notEqual(second.requests.items[0].id, first.requests.items[0].id);
  const third = (
    await request(
      e,
      "/business-summary?limit=1&cursor=" +
        encodeURIComponent(second.requests.next),
      "GET",
      undefined,
      admin.token,
    )
  ).data;
  assert.equal(third.requests.items.length, 1);
  assert.equal(third.requests.next, null);
  assert.equal(
    new Set([first, second, third].map((x) => x.requests.items[0].id)).size,
    3,
  );
  assert.equal(
    (
      await request(
        e,
        "/business-summary?cursor=bad",
        "GET",
        undefined,
        admin.token,
      )
    ).status,
    400,
  );
  e.DB.db.prepare("DELETE FROM maintenance_requests WHERE id=?").run(ids[0]);
  assert.equal(
    e.DB.db
      .prepare(
        "SELECT count(*) n FROM notifications WHERE maintenance_request_id=?",
      )
      .get(ids[0])!.n,
    0,
  );
});

test("Qualitative observations accept only the seven explicit states and never invent numeric readings", async () => {
  const e = context(),
    owner = await user(e, "qualowner"),
    id = await pool(e, owner);
  const levels = [
    "very_low",
    "low",
    "slightly_low",
    "in_range",
    "slightly_high",
    "high",
    "very_high",
  ];
  for (const level of levels) {
    const r = await request(
      e,
      `/pools/${id}/records`,
      "POST",
      {
        kind: "analysis",
        measured_at: measured(),
        assessments: { ph: level, chlorine: level },
      },
      owner.token,
    );
    assert.equal(r.status, 201, JSON.stringify(r.data));
    const saved = (
      await request(e, `/records/${r.data.id}`, "GET", undefined, owner.token)
    ).data;
    assert.deepEqual(saved.assessments, { ph: level, chlorine: level });
    assert.deepEqual(saved.readings, {});
  }
  for (const assessments of [
    { ph: "good" },
    { ph: 7.2 },
    { ph: {} },
    { salt: "in_range" },
    [],
    "in_range",
  ]) {
    assert.equal(
      (
        await request(
          e,
          `/pools/${id}/records`,
          "POST",
          { kind: "analysis", measured_at: measured(), assessments },
          owner.token,
        )
      ).status,
      400,
    );
  }
  assert.equal(
    (
      await request(
        e,
        `/pools/${id}/records`,
        "POST",
        {
          kind: "analysis",
          measured_at: measured(),
          readings: { ph: 7.2 },
          assessments: { ph: "in_range" },
        },
        owner.token,
      )
    ).status,
    400,
  );
});

test("Latest assessment supersedes the older numeric dashboard value while historical measurements remain separate", async () => {
  const e = context(),
    owner = await user(e, "qualowner"),
    outsider = await user(e, "qualoutside"),
    id = await pool(e, owner);
  const old = await request(
    e,
    `/pools/${id}/records`,
    "POST",
    {
      kind: "analysis",
      measured_at: new Date(Date.now() - 60000).toISOString(),
      readings: { ph: 7.2, chlorine: 1.5 },
    },
    owner.token,
  );
  assert.equal(
    (
      await request(
        e,
        `/records/${old.data.id}/publish`,
        "POST",
        {},
        owner.token,
      )
    ).status,
    200,
  );
  const recent = await request(
    e,
    `/pools/${id}/records`,
    "POST",
    {
      kind: "analysis",
      measured_at: measured(),
      assessments: { ph: "slightly_high", chlorine: "low" },
    },
    owner.token,
  );
  assert.equal(
    (await request(e, `/pools/${id}/overview`, "GET", undefined, owner.token))
      .data.measurements.ph.value,
    7.2,
  ); // draft is not published
  assert.equal(
    (
      await request(
        e,
        `/records/${recent.data.id}/publish`,
        "POST",
        {},
        owner.token,
      )
    ).status,
    200,
  );
  const overview = (
    await request(e, `/pools/${id}/overview`, "GET", undefined, owner.token)
  ).data;
  assert.equal(overview.measurements.ph.assessment, "slightly_high");
  assert.equal(overview.measurements.ph.value, null);
  assert.equal(overview.measurements.chlorine.assessment, "low");
  const trends = (
    await request(e, `/pools/${id}/trends`, "GET", undefined, owner.token)
  ).data;
  assert.equal(trends.items.length, 1);
  assert.equal(trends.items[0].ph, 7.2);
  assert.equal(trends.items[0].chlorine, 1.5);
  assert.equal(trends.items[0].samples, 1);
  assert.equal(trends.assessments.length, 1);
  assert.equal(trends.assessments[0].assessments.ph, "slightly_high");
  const correction = await request(
    e,
    `/pools/${id}/records`,
    "POST",
    {
      kind: "analysis",
      measured_at: measured(),
      correction_of: recent.data.id,
      assessments: { ph: "in_range" },
    },
    owner.token,
  );
  assert.equal(
    (
      await request(
        e,
        `/records/${correction.data.id}/publish`,
        "POST",
        {},
        owner.token,
      )
    ).status,
    200,
  );
  const corrected = (
    await request(e, `/pools/${id}/overview`, "GET", undefined, owner.token)
  ).data;
  assert.equal(corrected.measurements.ph.assessment, "in_range");
  assert.equal(corrected.measurements.chlorine.value, 1.5); // excluded superseded low reading
  assert.equal(
    (await request(e, `/pools/${id}/trends`, "GET", undefined, owner.token))
      .data.assessments.length,
    1,
  );
  assert.equal(
    (
      await request(
        e,
        `/records/${recent.data.id}`,
        "GET",
        undefined,
        owner.token,
      )
    ).data.assessments.chlorine,
    "low",
  );
  assert.equal(
    (await request(e, `/pools/${id}/trends`, "GET", undefined, outsider.token))
      .status,
    404,
  );
  const exported = (
    await request(e, `/pools/${id}/export`, "GET", undefined, owner.token)
  ).data;
  assert.ok(
    exported.records.some(
      (r: any) => JSON.parse(r.assessments).ph === "in_range",
    ),
  );
});

test("An entretien requires both observations before sharing and keeps qualitative drafts, photos and client records coherent", async () => {
  const e = context(),
    owner = await user(e, "qualowner"),
    admin = await user(e, "qualadmin", "pro"),
    id = await pool(e, owner);
  await invite(e, owner, admin, id, "principal");
  const draft = await request(
    e,
    `/pools/${id}/records`,
    "POST",
    { kind: "visit", measured_at: measured(), assessments: { ph: "in_range" } },
    admin.token,
  );
  const record = (
    await request(e, `/records/${draft.data.id}`, "GET", undefined, admin.token)
  ).data;
  const checklist = record.checklist.map((t: any) => ({ ...t, done: true }));
  let saved = await request(
    e,
    `/records/${record.id}`,
    "PUT",
    { ...record, checklist, assessments: { ph: "in_range" } },
    admin.token,
  );
  assert.equal(saved.status, 200);
  assert.equal(
    (await request(e, `/records/${record.id}/publish`, "POST", {}, admin.token))
      .status,
    400,
  );
  assert.equal(
    (await request(e, `/records/${record.id}`, "GET", undefined, owner.token))
      .status,
    404,
  );
  saved = await request(
    e,
    `/records/${record.id}`,
    "PUT",
    {
      ...record,
      revision: saved.data.revision,
      checklist,
      assessments: { ph: "in_range", chlorine: "slightly_low" },
    },
    admin.token,
  );
  assert.equal(saved.status, 200);
  assert.equal(
    (await request(e, `/records/${record.id}/publish`, "POST", {}, admin.token))
      .status,
    200,
  );
  const shared = (
    await request(e, `/records/${record.id}`, "GET", undefined, owner.token)
  ).data;
  assert.deepEqual(shared.assessments, {
    ph: "in_range",
    chlorine: "slightly_low",
  });
  assert.deepEqual(shared.readings, {});
  assert.equal(
    (await request(e, `/pools/${id}/overview`, "GET", undefined, owner.token))
      .data.last_visit.assessments.chlorine,
    "slightly_low",
  );
});

test("Assessment migration preserves old measurements and the qualitative timeline paginates without duplicate results", async () => {
  const old = new LocalD1("0007_business_provider.sql");
  old.db
    .prepare(
      "INSERT INTO users(id,username,name,password_hash,recovery_hash) VALUES('legacy','legacy','Legacy','unused','unused')",
    )
    .run();
  old.db
    .prepare(
      "INSERT INTO pools(id,name,created_by) VALUES('legacy','Legacy','legacy')",
    )
    .run();
  old.db
    .prepare(
      "INSERT INTO records(id,pool_id,author_id,author_name,kind,measured_at,readings,published_at) VALUES('legacy','legacy','legacy','Legacy','analysis',?, ?, ?)",
    )
    .run(measured(), JSON.stringify({ ph: 7.3, chlorine: 1.8 }), measured());
  old.db.exec(
    readFileSync(
      new URL("../schema/0008_water_assessments.sql", import.meta.url),
      "utf8",
    ),
  );
  const legacy = old.db
    .prepare("SELECT readings,assessments FROM records WHERE id='legacy'")
    .get()!;
  assert.equal(legacy.assessments, "{}");
  assert.deepEqual(JSON.parse(legacy.readings as string), {
    ph: 7.3,
    chlorine: 1.8,
  });
  const e = context(),
    owner = await user(e, "qualowner"),
    id = await pool(e, owner),
    otherId = await pool(e, owner, "Autre bassin");
  const insert = e.DB.db.prepare(
    "INSERT INTO records(id,pool_id,author_id,author_name,kind,measured_at,assessments,published_at) VALUES(?,?,?,'Fixture','analysis',?,?,?)",
  );
  for (let i = 0; i < 53; i++)
    insert.run(
      crypto.randomUUID(),
      id,
      owner.user.id,
      measured(),
      JSON.stringify({ ph: "in_range" }),
      measured(),
    );
  const foreignId = crypto.randomUUID();
  insert.run(
    foreignId,
    otherId,
    owner.user.id,
    measured(),
    JSON.stringify({ ph: "high" }),
    measured(),
  );
  const first = (
    await request(e, `/pools/${id}/trends`, "GET", undefined, owner.token)
  ).data;
  assert.equal(first.assessments.length, 50);
  assert.deepEqual(first.items, []);
  assert.ok(first.assessments_next);
  const second = (
    await request(
      e,
      `/pools/${id}/trends?assessment_cursor=${first.assessments_next}`,
      "GET",
      undefined,
      owner.token,
    )
  ).data;
  assert.equal(second.assessments.length, 3);
  assert.equal(second.assessments_next, null);
  assert.equal(
    new Set([...first.assessments, ...second.assessments].map((r: any) => r.id))
      .size,
    53,
  );
  assert.equal(
    (
      await request(
        e,
        `/pools/${id}/trends?assessment_cursor=${foreignId}`,
        "GET",
        undefined,
        owner.token,
      )
    ).status,
    400,
  );
});

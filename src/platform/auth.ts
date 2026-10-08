import { Hono } from "hono";
import { getCookie, setCookie, deleteCookie } from "hono/cookie";
import {
  Env,
  C,
  User,
  uid,
  who,
  fail,
  str,
  stmt,
  row,
  limit,
  publicUser,
  place,
  choice,
  number,
  notify,
} from "./core";
const COOKIE = "pib_session";
const enc = new TextEncoder();
const hex = (a: ArrayBuffer) =>
  Array.from(new Uint8Array(a), (x) => x.toString(16).padStart(2, "0")).join(
    "",
  );
export const digest = async (s: string) =>
  hex(await crypto.subtle.digest("SHA-256", enc.encode(s)));
export const secret = () =>
  hex(crypto.getRandomValues(new Uint8Array(32)).buffer);
async function passwordHash(c: C, password: string, salt = secret()) {
  if (!c.env.SESSION_SECRET || c.env.SESSION_SECRET.length < 32)
    fail("Authentification temporairement indisponible.", 503);
  // Workers PBKDF2 limit: pepper stored separately from D1 + per-user random salt.
  const pepper = await crypto.subtle.importKey(
    "raw",
    enc.encode(c.env.SESSION_SECRET),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const prehash = await crypto.subtle.sign(
    "HMAC",
    pepper,
    enc.encode(password),
  );
  const key = await crypto.subtle.importKey("raw", prehash, "PBKDF2", false, [
    "deriveBits",
  ]);
  return `pib1$${salt}$${hex(await crypto.subtle.deriveBits({ name: "PBKDF2", salt: enc.encode(salt), iterations: 100000, hash: "SHA-256" }, key, 256))}`;
}
const safeEqual = (a: string, b: string) => {
  let x = a.length ^ b.length;
  for (let i = 0; i < Math.max(a.length, b.length); i++)
    x |= (a.charCodeAt(i) || 0) ^ (b.charCodeAt(i) || 0);
  return x === 0;
};
const password = (v: unknown) => {
  const s = str(v, 128, true);
  if (s.length < 12) fail("Choisis un mot de passe de 12 caractères minimum.");
  return s;
};
const username = (v: unknown) => {
  const s = str(v, 40, true).toLowerCase();
  if (!/^[a-z0-9][a-z0-9._-]{2,39}$/.test(s))
    fail(
      "Identifiant : 3 à 40 lettres minuscules, chiffres, points ou tirets.",
    );
  return s;
};
async function session(c: C, id: string) {
  const token = secret();
  await stmt(
    c,
    "INSERT INTO sessions(token_hash,user_id,expires_at) VALUES(?,?,?)",
    await digest(token),
    id,
    Date.now() + 30 * 86400000,
  ).run();
  setCookie(c, COOKIE, token, {
    httpOnly: true,
    secure: true,
    sameSite: "Strict",
    path: "/",
    maxAge: 30 * 86400,
  });
}
export async function authenticate(c: C, next: () => Promise<void>) {
  const token = getCookie(c, COOKIE);
  if (!token) fail("Connecte-toi pour continuer.", 401);
  const hash = await digest(token);
  const u = await row<User>(
    c,
    "SELECT u.* FROM sessions s JOIN users u ON u.id=s.user_id WHERE s.token_hash=? AND s.expires_at>? AND u.disabled=0",
    hash,
    Date.now(),
  );
  if (!u) fail("Session expirée. Connecte-toi à nouveau.", 401);
  c.set("user", u);
  c.set("sessionHash", hash);
  await next();
}
export const auth = new Hono<Env>();
auth.use("*", async (c, next) => {
  const ip = c.req.header("CF-Connecting-IP") || "local";
  await limit(c, `auth:${await digest(ip)}`, 35, 900);
  await next();
});
auth.post("/signup", async (c) => {
  const b = await c.req.json();
  const name = str(b.name, 80, true),
    login = username(b.username),
    pwd = password(b.password);
  const role = choice(b.role, ["client", "pro"] as const);
  await limit(
    c,
    `signup:${await digest(c.req.header("CF-Connecting-IP") || "local")}`,
    8,
    3600,
  );
  const id = uid(),
    recovery = secret();
  const hash = await passwordHash(c, pwd);
  try {
    await stmt(
      c,
      "INSERT INTO users(id,username,name,password_hash,recovery_hash,is_pro) VALUES(?,?,?,?,?,?)",
      id,
      login,
      name,
      hash,
      await digest(recovery),
      role === "pro" ? 1 : 0,
    ).run();
  } catch (e) {
    if (String(e).includes("UNIQUE"))
      fail("Cet identifiant est déjà utilisé.", 409);
    throw e;
  }
  await session(c, id);
  const u = await row<User>(c, "SELECT * FROM users WHERE id=?", id);
  return c.json({ user: publicUser(u!), recovery_code: recovery }, 201);
});
auth.post("/login", async (c) => {
  const b = await c.req.json();
  const login = username(b.username),
    pwd = str(b.password, 128, true);
  await limit(c, `login:${await digest(login)}`, 15, 900);
  const u = await row<any>(
    c,
    "SELECT * FROM users WHERE username=? AND disabled=0",
    login,
  );
  const stored =
    u?.password_hash ||
    "pib1$00000000000000000000000000000000$00000000000000000000000000000000";
  const candidate = await passwordHash(c, pwd, stored.split("$")[1]);
  if (!u || !safeEqual(candidate, stored))
    fail("Identifiant ou mot de passe incorrect.", 401);
  await session(c, u.id);
  return c.json({ user: publicUser(u) });
});
auth.post("/recover", async (c) => {
  const b = await c.req.json();
  const login = username(b.username),
    code = str(b.code, 64, true),
    pwd = password(b.password);
  await limit(c, `recovery:${await digest(login)}`, 8, 3600);
  const u = await row<any>(
    c,
    "SELECT * FROM users WHERE username=? AND disabled=0",
    login,
  );
  if (!u || !safeEqual(await digest(code), u.recovery_hash))
    fail("Identifiant ou code de récupération incorrect.", 401);
  const nextCode = secret(),
    hash = await passwordHash(c, pwd);
  const result = await c.env.DB.batch([
    stmt(
      c,
      "UPDATE users SET password_hash=?,recovery_hash=? WHERE id=? AND recovery_hash=?",
      hash,
      await digest(nextCode),
      u.id,
      u.recovery_hash,
    ),
    stmt(c, "DELETE FROM sessions WHERE user_id=? AND changes()=1", u.id),
  ]);
  if (!result[0].meta.changes) fail("Ce code a déjà été utilisé.", 409);
  await session(c, u.id);
  return c.json({ user: publicUser(u), recovery_code: nextCode });
});
export const account = new Hono<Env>();
account.get("/me", (c) =>
  c.json({
    ...publicUser(who(c)),
    is_admin: Boolean(c.env.ADMIN_USER_ID && who(c).id === c.env.ADMIN_USER_ID),
  }),
);
account.post("/logout", async (c) => {
  await stmt(
    c,
    "DELETE FROM sessions WHERE token_hash=?",
    c.get("sessionHash"),
  ).run();
  deleteCookie(c, COOKIE, { path: "/" });
  return c.json({ ok: true });
});
account.put("/me", async (c) => {
  const b = await c.req.json(),
    u = who(c);
  const pro = u.is_pro || b.enable_pro === true ? 1 : 0;
  let location = null;
  if (b.city_code) location = await place(str(b.city_code, 5, true));
  const specs = Array.isArray(b.specialties)
    ? b.specialties
        .slice(0, 12)
        .map((s: any) =>
          choice(s, [
            "maintenance",
            "water",
            "filtration",
            "electricity",
            "leak",
            "renovation",
            "winter",
            "opening",
          ] as const),
        )
    : [];
  await stmt(
    c,
    "UPDATE users SET name=?,is_pro=?,company=?,city_code=?,city=?,latitude=?,longitude=?,radius_km=?,specialties=? WHERE id=?",
    str(b.name, 80, true),
    pro,
    str(b.company, 100),
    location?.code || u.city_code,
    location?.name || u.city,
    location?.lat ?? u.latitude,
    location?.lng ?? u.longitude,
    number(b.radius_km, 5, 150, u.radius_km),
    JSON.stringify(specs),
    u.id,
  ).run();
  return c.json(
    publicUser((await row<User>(c, "SELECT * FROM users WHERE id=?", u.id))!),
  );
});
account.post("/password", async (c) => {
  const b = await c.req.json(),
    u = await row<any>(c, "SELECT * FROM users WHERE id=?", who(c).id);
  if (
    !safeEqual(
      await passwordHash(
        c,
        str(b.current_password, 128, true),
        u.password_hash.split("$")[1],
      ),
      u.password_hash,
    )
  )
    fail("Mot de passe actuel incorrect.", 401);
  const code = secret();
  await c.env.DB.batch([
    stmt(
      c,
      "UPDATE users SET password_hash=?,recovery_hash=? WHERE id=?",
      await passwordHash(c, password(b.password)),
      await digest(code),
      u.id,
    ),
    stmt(c, "DELETE FROM sessions WHERE user_id=?", u.id),
  ]);
  await session(c, u.id);
  return c.json({ recovery_code: code });
});
account.get("/notifications", async (c) => {
  const list = await stmt(
    c,
    "SELECT n.* FROM notifications n WHERE n.user_id=? ORDER BY n.created_at DESC,n.id DESC LIMIT 50",
    who(c).id,
  ).all();
  const unread = await row<{ n: number }>(
    c,
    "SELECT count(*) n FROM notifications WHERE user_id=? AND read_at IS NULL",
    who(c).id,
  );
  return c.json({ items: list.results, unread: unread?.n || 0 });
});
account.post("/notifications/read", async (c) => {
  await stmt(
    c,
    "UPDATE notifications SET read_at=strftime('%Y-%m-%dT%H:%M:%fZ','now') WHERE user_id=? AND read_at IS NULL",
    who(c).id,
  ).run();
  return c.json({ ok: true });
});

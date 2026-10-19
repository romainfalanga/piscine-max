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
  emailAddress,
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
async function verifyCurrentPassword(c: C, value: unknown, u: any) {
  await limit(c, `account-password:${u.id}`, 15, 900);
  if (
    !safeEqual(
      await passwordHash(
        c,
        str(value, 128, true),
        u.password_hash.split("$")[1],
      ),
      u.password_hash,
    )
  )
    fail("Mot de passe actuel incorrect.", 401);
}
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
  c.set("user", { ...u, name: u.login_email || "Compte à compléter" });
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
  const email = emailAddress(b.email),
    pwd = password(b.password);
  const role = choice(b.role, ["client", "pro"] as const, "client");
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
      "INSERT INTO users(id,username,name,password_hash,recovery_hash,is_pro,email,login_email) VALUES(?,?,?,?,?,?,?,?)",
      id,
      id,
      email,
      hash,
      await digest(recovery),
      role === "pro" ? 1 : 0,
      email,
      email,
    ).run();
  } catch (e) {
    if (String(e).includes("UNIQUE"))
      fail("Cette adresse email est déjà associée à un compte.", 409);
    throw e;
  }
  await session(c, id);
  const u = await row<User>(c, "SELECT * FROM users WHERE id=?", id);
  return c.json({ user: publicUser(u!), recovery_code: recovery }, 201);
});
auth.post("/login", async (c) => {
  const b = await c.req.json();
  const login = emailAddress(b.email),
    pwd = str(b.password, 128, true);
  await limit(c, `login:${await digest(login)}`, 15, 900);
  const u = await row<any>(
    c,
    "SELECT * FROM users WHERE login_email=? AND disabled=0",
    login,
  );
  const stored =
    u?.password_hash ||
    "pib1$00000000000000000000000000000000$00000000000000000000000000000000";
  const candidate = await passwordHash(c, pwd, stored.split("$")[1]);
  if (!u || !safeEqual(candidate, stored))
    fail("Adresse email ou mot de passe incorrect.", 401);
  await session(c, u.id);
  return c.json({ user: publicUser(u) });
});
auth.post("/recover", async (c) => {
  const b = await c.req.json(),
    email = emailAddress(b.email),
    code = str(b.code, 64, true),
    pwd = password(b.password);
  await limit(c, `recovery:${await digest(email)}`, 8, 3600);
  const codeHash = await digest(code);
  const u = await row<any>(
    c,
    "SELECT * FROM users WHERE recovery_hash=? AND disabled=0",
    codeHash,
  );
  // Existing email identities cannot be retargeted with a recovery request.
  // Legacy accounts without one may claim their own account with its secret code.
  if (!u || (u.login_email && u.login_email !== email))
    fail("Adresse email ou code de récupération incorrect.", 401);
  const nextCode = secret(),
    hash = await passwordHash(c, pwd);
  let result;
  try {
    result = await c.env.DB.batch([
      stmt(
        c,
        "UPDATE users SET password_hash=?,recovery_hash=?,email=?,login_email=?,name=? WHERE id=? AND recovery_hash=?",
        hash,
        await digest(nextCode),
        email,
        email,
        email,
        u.id,
        codeHash,
      ),
      stmt(c, "DELETE FROM sessions WHERE user_id=? AND changes()=1", u.id),
    ]);
  } catch (e) {
    if (String(e).includes("UNIQUE"))
      fail("Cette adresse email est déjà associée à un compte.", 409);
    throw e;
  }
  if (!result[0].meta.changes) fail("Ce code a déjà été utilisé.", 409);
  await session(c, u.id);
  return c.json({
    user: publicUser({ ...u, login_email: email }),
    recovery_code: nextCode,
  });
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
  if (
    b.enable_pro === true ||
    (b.is_pro !== undefined && Number(b.is_pro) !== u.is_pro)
  )
    fail("Le type de compte ne se modifie pas depuis le profil.", 403);
  const email = emailAddress(b.email ?? u.login_email),
    changedEmail = email !== u.login_email;
  if (changedEmail) {
    const stored = await row<any>(c, "SELECT * FROM users WHERE id=?", u.id);
    await verifyCurrentPassword(c, b.current_password, stored);
  }
  let location = null;
  if (u.is_pro && b.city_code)
    location = await place(str(b.city_code, 5, true));
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
    : JSON.parse(u.specialties || "[]");
  try {
    await stmt(
      c,
      "UPDATE users SET name=?,email=?,login_email=?,company=?,city_code=?,city=?,latitude=?,longitude=?,radius_km=?,specialties=? WHERE id=?",
      email,
      email,
      email,
      u.is_pro && b.company !== undefined ? str(b.company, 100) : u.company,
      location?.code || u.city_code,
      location?.name || u.city,
      location?.lat ?? u.latitude,
      location?.lng ?? u.longitude,
      u.is_pro ? number(b.radius_km, 5, 150, u.radius_km) : u.radius_km,
      u.is_pro ? JSON.stringify(specs) : u.specialties,
      u.id,
    ).run();
  } catch (e) {
    if (String(e).includes("UNIQUE"))
      fail("Cette adresse email est déjà associée à un compte.", 409);
    throw e;
  }
  if (changedEmail)
    await stmt(
      c,
      "DELETE FROM sessions WHERE user_id=? AND token_hash!=?",
      u.id,
      c.get("sessionHash"),
    ).run();
  return c.json(
    publicUser((await row<User>(c, "SELECT * FROM users WHERE id=?", u.id))!),
  );
});
account.post("/password", async (c) => {
  const b = await c.req.json(),
    u = await row<any>(c, "SELECT * FROM users WHERE id=?", who(c).id);
  await verifyCurrentPassword(c, b.current_password, u);
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
    "SELECT n.* FROM notifications n WHERE n.user_id=? AND (n.pool_id IS NULL OR EXISTS(SELECT 1 FROM pool_members m JOIN pools p ON p.id=m.pool_id WHERE m.pool_id=n.pool_id AND m.user_id=n.user_id AND m.kind IN('owner','principal') AND m.revoked_at IS NULL AND (m.expires_at IS NULL OR m.expires_at>strftime('%Y-%m-%dT%H:%M:%fZ','now')) AND p.archived_at IS NULL)) AND n.request_id IS NULL AND n.type NOT IN('help','offer','mission') ORDER BY n.created_at DESC,n.id DESC LIMIT 50",
    who(c).id,
  ).all();
  const unread = await row<{ n: number }>(
    c,
    "SELECT count(*) n FROM notifications n WHERE n.user_id=? AND (n.pool_id IS NULL OR EXISTS(SELECT 1 FROM pool_members m JOIN pools p ON p.id=m.pool_id WHERE m.pool_id=n.pool_id AND m.user_id=n.user_id AND m.kind IN('owner','principal') AND m.revoked_at IS NULL AND (m.expires_at IS NULL OR m.expires_at>strftime('%Y-%m-%dT%H:%M:%fZ','now')) AND p.archived_at IS NULL)) AND request_id IS NULL AND type NOT IN('help','offer','mission') AND read_at IS NULL",
    who(c).id,
  );
  return c.json({ items: list.results, unread: unread?.n || 0 });
});
account.post("/notifications/read", async (c) => {
  await stmt(
    c,
    "UPDATE notifications SET read_at=strftime('%Y-%m-%dT%H:%M:%fZ','now') WHERE user_id=? AND request_id IS NULL AND type NOT IN('help','offer','mission') AND read_at IS NULL",
    who(c).id,
  ).run();
  return c.json({ ok: true });
});

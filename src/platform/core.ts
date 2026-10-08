import type { Context } from "hono";
import { HTTPException } from "hono/http-exception";
export type User = {
  id: string;
  username: string;
  name: string;
  is_pro: number;
  company: string;
  city_code: string | null;
  city: string | null;
  latitude: number | null;
  longitude: number | null;
  radius_km: number;
  specialties: string;
  disabled: number;
};
export type Env = {
  Bindings: {
    DB: D1Database;
    PHOTOS: R2Bucket;
    SESSION_SECRET?: string;
    ADMIN_USER_ID?: string;
    OPENROUTER_API_KEY?: string;
    OPENROUTER_MODEL?: string;
  };
  Variables: { user: User; sessionHash: string; requestId: string };
};
export type C = Context<Env>;
export const uid = () => crypto.randomUUID();
export const now = () => new Date().toISOString();
export function fail(
  message: string,
  status: 400 | 401 | 403 | 404 | 409 | 413 | 429 | 503 = 400,
): never {
  throw new HTTPException(status, { message });
}
export const stmt = (c: C, sql: string, ...args: any[]) =>
  c.env.DB.prepare(sql).bind(...args);
export const row = <T = any>(c: C, sql: string, ...args: any[]) =>
  stmt(c, sql, ...args).first<T>();
export const rows = async <T = any>(c: C, sql: string, ...args: any[]) =>
  (await stmt(c, sql, ...args).all<T>()).results;
export const who = (c: C) => c.get("user");
export const requirePro = (c: C) => {
  if (!who(c).is_pro) fail("Espace réservé aux piscinistes.", 403);
};
export const isAdmin = (c: C) =>
  Boolean(c.env.ADMIN_USER_ID && who(c).id === c.env.ADMIN_USER_ID);
export function str(value: unknown, max = 200, required = false): string {
  if (typeof value !== "string") {
    if (required) fail("Champ requis.");
    return "";
  }
  const s = value.trim();
  if (s.length > max || (required && !s))
    fail(`Texte requis ou trop long (maximum ${max} caractères).`);
  return s;
}
export function number(
  value: unknown,
  min: number,
  max: number,
  fallback: number | null = null,
) {
  if (value == null || value === "") return fallback;
  const n = Number(value);
  if (!Number.isFinite(n) || n < min || n > max)
    fail("Valeur numérique invalide.");
  return n;
}
export function choice<T extends string>(
  v: unknown,
  allowed: readonly T[],
  fallback?: T,
): T {
  if (v == null && fallback) return fallback;
  if (!allowed.includes(v as T)) fail("Choix invalide.");
  return v as T;
}
export function date(v: unknown, required = true): string {
  const s = str(v, 10, required);
  if (!s && !required) return "";
  if (
    !/^\d{4}-\d{2}-\d{2}$/.test(s) ||
    Number.isNaN(Date.parse(s)) ||
    new Date(s).toISOString().slice(0, 10) !== s
  )
    fail("Date invalide.");
  return s;
}
export function instant(v: unknown): string {
  const s = str(v, 35, true);
  const d = new Date(s);
  if (
    Number.isNaN(d.getTime()) ||
    d.getTime() > Date.now() + 300000 ||
    d.getUTCFullYear() < 2000
  )
    fail("Date et heure de mesure invalides.");
  return d.toISOString();
}
export function clock(v: unknown) {
  const s = str(v, 5) || "09:00";
  if (!/^([01]\d|2[0-3]):[0-5]\d$/.test(s)) fail("Heure invalide.");
  return s;
}
export const ACTIVE =
  "m.revoked_at IS NULL AND (m.expires_at IS NULL OR m.expires_at>strftime('%Y-%m-%dT%H:%M:%fZ','now'))";
export async function access(c: C, poolId: string, manager = false) {
  const p = await row(
    c,
    `SELECT p.*,m.kind AS membership,m.manager,m.expires_at AS access_until FROM pools p JOIN pool_members m ON m.pool_id=p.id WHERE p.id=? AND m.user_id=? AND ${ACTIVE} AND p.archived_at IS NULL`,
    poolId,
    who(c).id,
  );
  if (!p) fail("Piscine inaccessible.", 404);
  if (manager && !p.manager)
    fail("Seul le responsable de la piscine peut gérer cet accès.", 403);
  return p;
}
export function professionalAccess(c: C, p: any) {
  requirePro(c);
  if (!["principal", "temporary"].includes(p.membership))
    fail("Une autorisation professionnelle est nécessaire.", 403);
}
export const audit = (
  c: C,
  action: string,
  poolId: string | null,
  target: string | null,
) =>
  stmt(
    c,
    "INSERT INTO audit(id,actor_id,pool_id,action,target_id) VALUES(?,?,?,?,?)",
    uid(),
    who(c).id,
    poolId,
    action,
    target,
  );
export const notify = (
  c: C,
  userId: string,
  type: string,
  title: string,
  body = "",
  poolId: string | null = null,
  requestId: string | null = null,
) =>
  stmt(
    c,
    "INSERT INTO notifications(id,user_id,type,title,body,pool_id,request_id) VALUES(?,?,?,?,?,?,?)",
    uid(),
    userId,
    type,
    title,
    body,
    poolId,
    requestId,
  );
export function notifyPool(
  c: C,
  poolId: string,
  type: string,
  title: string,
  body = "",
  ownersOnly = false,
) {
  return stmt(
    c,
    `INSERT INTO notifications(id,user_id,type,title,body,pool_id) SELECT lower(hex(randomblob(16))),m.user_id,?,?,?,m.pool_id FROM pool_members m WHERE m.pool_id=? AND m.user_id!=? AND ${ACTIVE} ${ownersOnly ? "AND m.kind='owner'" : ""}`,
    type,
    title,
    body,
    poolId,
    who(c).id,
  );
}
export function cursor(c: C) {
  return {
    limit: Math.floor(number(c.req.query("limit"), 1, 50, 25)!),
    cursor: str(c.req.query("cursor"), 200),
  };
}
export function page<T extends { id: string }>(items: T[], limit: number) {
  return {
    items: items.slice(0, limit),
    next: items.length > limit ? items[limit - 1].id : null,
  };
}
export const jsonParse = (s: string, fallback: any = {}) => {
  try {
    return JSON.parse(s);
  } catch {
    return fallback;
  }
};
export async function limit(
  c: C,
  bucket: string,
  max: number,
  seconds: number,
) {
  const reset = Math.floor(Date.now() / 1000 / seconds) * seconds + seconds;
  const key = `${bucket}:${reset}`;
  const r = await row<{ count: number }>(
    c,
    "INSERT INTO rate_limits(key,count,reset_at) VALUES(?,1,?) ON CONFLICT(key) DO UPDATE SET count=count+1 RETURNING count",
    key,
    reset,
  );
  if ((r?.count || 0) > max) {
    c.header(
      "Retry-After",
      String(Math.max(1, reset - Math.floor(Date.now() / 1000))),
    );
    fail("Trop de tentatives. Réessaie dans quelques instants.", 429);
  }
}
export const publicUser = (u: User) => ({
  id: u.id,
  username: u.username,
  name: u.name,
  is_pro: u.is_pro,
  company: u.company,
  city_code: u.city_code,
  city: u.city,
  radius_km: u.radius_km,
  specialties: jsonParse(u.specialties, []),
});
export async function place(code: string) {
  if (!/^\d[\dAB]\d{3}$/.test(code))
    fail("Choisis une commune dans les résultats.");
  const r = await fetch(
    `https://geo.api.gouv.fr/communes/${encodeURIComponent(code)}?fields=nom,code,centre,codesPostaux`,
    { signal: AbortSignal.timeout(5000) },
  );
  if (!r.ok) fail("Commune indisponible. Réessaie.", 503);
  const p: any = await r.json();
  if (!Array.isArray(p.centre?.coordinates))
    fail("Cette commune ne dispose pas de localisation.", 400);
  return {
    code: p.code,
    name: p.nom,
    lat: p.centre.coordinates[1],
    lng: p.centre.coordinates[0],
  };
}
export function privateText(value: unknown, max: number) {
  const s = str(value, max, true);
  if (
    /\b[\w.+-]+@[\w.-]+\.[a-z]{2,}\b|(?:\+33|0)[1-9](?:[ .-]?\d{2}){4}|https?:\/\//i.test(
      s,
    )
  )
    fail(
      "Retire les coordonnées personnelles et liens de la demande. Partage-les uniquement après autorisation.",
    );
  return s;
}
export function readings(v: any) {
  const out: Record<string, number> = {};
  const ranges: Record<string, number[]> = {
    ph: [0, 14],
    chlorine: [0, 30],
    salt: [0, 50],
    water_temp: [0, 60],
    tac: [0, 1000],
    stabilizer: [0, 1000],
    bromine: [0, 30],
    hardness: [0, 2000],
  };
  if (v == null) return out;
  if (typeof v !== "object" || Array.isArray(v)) fail("Relevés invalides.");
  for (const [k, range] of Object.entries(ranges)) {
    const n = number(v[k], range[0], range[1]);
    if (n !== null) out[k] = n;
  }
  return out;
}

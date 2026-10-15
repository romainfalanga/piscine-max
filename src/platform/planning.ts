import { Hono } from "hono";
import {
  Env,
  who,
  uid,
  now,
  fail,
  str,
  number,
  choice,
  stmt,
  row,
  rows,
  access,
  audit,
  notifyPool,
  professionalAccess,
  ACTIVE,
  date,
  clock,
  jsonParse,
} from "./core";
export const planning = new Hono<Env>();
const day = (s: string) => new Date(s + "T12:00:00Z");
const dayString = (d: Date) => d.toISOString().slice(0, 10);
export function occurs(schedule: any, iso: string): boolean {
  if (
    !schedule.active ||
    iso < schedule.start_date ||
    (schedule.end_date && iso > schedule.end_date)
  )
    return false;
  const d = day(iso),
    wd = d.getUTCDay() || 7,
    seasons =
      typeof schedule.seasons === "string"
        ? jsonParse(schedule.seasons, [])
        : schedule.seasons || [];
  let anchor = day(schedule.start_date),
    interval = schedule.interval_days,
    weekday = schedule.weekday;
  if (seasons.length) {
    const md = iso.slice(5),
      s = seasons.find((s: any) =>
        s.start <= s.end
          ? md >= s.start && md <= s.end
          : md >= s.start || md <= s.end,
      );
    if (!s) return false;
    let year = d.getUTCFullYear();
    if (s.start > s.end && md < s.start) year--;
    anchor = day(`${year}-${s.start}`);
    interval = s.interval_days;
    weekday = s.weekday || null;
  }
  if (weekday) {
    const shift = (weekday - (anchor.getUTCDay() || 7) + 7) % 7;
    anchor.setUTCDate(anchor.getUTCDate() + shift);
    if (wd !== weekday) return false;
  }
  const days = Math.round((d.getTime() - anchor.getTime()) / 86400000);
  return days >= 0 && days % interval === 0;
}
function seasons(v: any) {
  if (v == null) return [];
  if (!Array.isArray(v) || v.length > 8) fail("Maximum huit saisons.");
  const list = v.map((s: any) => {
    const start = str(s.start, 5, true),
      end = str(s.end, 5, true);
    date("2024-" + start);
    date("2024-" + end);
    return {
      start,
      end,
      interval_days: Math.floor(number(s.interval_days, 1, 365, 7)!),
      weekday: number(s.weekday, 1, 7),
    };
  });
  for (let n = 0; n < 366; n++) {
    const d = new Date(Date.UTC(2024, 0, 1 + n, 12)),
      md = dayString(d).slice(5);
    if (
      list.filter((s: any) =>
        s.start <= s.end
          ? md >= s.start && md <= s.end
          : md >= s.start || md <= s.end,
      ).length > 1
    )
      fail("Les saisons ne doivent pas se chevaucher.");
  }
  return list;
}
function planBody(b: any) {
  const start = date(b.start_date),
    end = date(b.end_date, false) || null;
  if (end && end < start) fail("La fin doit suivre le début.");
  return {
    start,
    end,
    weekday: number(b.weekday, 1, 7),
    interval: Math.floor(number(b.interval_days, 1, 365, 7)!),
    time: clock(b.time),
    duration: Math.floor(number(b.duration, 5, 1440, 45)!),
    title: str(b.title, 120) || "Entretien",
    seasons: JSON.stringify(seasons(b.seasons)),
  };
}
planning.post("/pools/:id/schedules", async (c) => {
  const p = await access(c, c.req.param("id"));
  professionalAccess(c, p);
  const b = await c.req.json(),
    v = planBody(b),
    id = uid();
  await c.env.DB.batch([
    stmt(
      c,
      "INSERT INTO schedules(id,pool_id,pro_id,title,start_date,end_date,weekday,interval_days,time,duration,seasons) VALUES(?,?,?,?,?,?,?,?,?,?,?)",
      id,
      p.id,
      who(c).id,
      v.title,
      v.start,
      v.end,
      v.weekday,
      v.interval,
      v.time,
      v.duration,
      v.seasons,
    ),
    notifyPool(
      c,
      p.id,
      "planning",
      "Un entretien récurrent a été planifié",
      v.title,
      true,
    ),
    audit(c, "schedule.created", p.id, id),
  ]);
  return c.json({ id }, 201);
});
planning.get("/pools/:id/schedules", async (c) => {
  const p = await access(c, c.req.param("id"));
  return c.json({
    items: (
      await rows(
        c,
        `SELECT s.*,u.name pro_name FROM schedules s JOIN users u ON u.id=s.pro_id JOIN pool_members m ON m.pool_id=s.pool_id AND m.user_id=s.pro_id WHERE s.pool_id=? AND s.active=1 AND ${ACTIVE}`,
        p.id,
      )
    ).map((s) => ({ ...s, seasons: jsonParse(s.seasons, []) })),
  });
});
planning.put("/schedules/:id", async (c) => {
  const s = await row<any>(
    c,
    "SELECT * FROM schedules WHERE id=? AND pro_id=?",
    c.req.param("id"),
    who(c).id,
  );
  if (!s) fail("Planning inaccessible.", 404);
  const p = await access(c, s.pool_id);
  professionalAccess(c, p);
  const v = planBody(await c.req.json());
  await c.env.DB.batch([
    stmt(
      c,
      "UPDATE schedules SET title=?,start_date=?,end_date=?,weekday=?,interval_days=?,time=?,duration=?,seasons=? WHERE id=? AND pro_id=?",
      v.title,
      v.start,
      v.end,
      v.weekday,
      v.interval,
      v.time,
      v.duration,
      v.seasons,
      s.id,
      who(c).id,
    ),
    notifyPool(
      c,
      p.id,
      "planning",
      "Le planning d’entretien a été modifié",
      v.title,
      true,
    ),
    audit(c, "schedule.updated", p.id, s.id),
  ]);
  return c.json({ ok: true });
});
planning.delete("/schedules/:id", async (c) => {
  const s = await row<any>(
    c,
    "SELECT * FROM schedules WHERE id=? AND pro_id=?",
    c.req.param("id"),
    who(c).id,
  );
  if (!s) fail("Planning inaccessible.", 404);
  await access(c, s.pool_id);
  await c.env.DB.batch([
    stmt(c, "UPDATE schedules SET active=0 WHERE id=?", s.id),
    notifyPool(
      c,
      s.pool_id,
      "planning",
      "Une récurrence d’entretien a été arrêtée",
      "Les passages déjà réalisés restent dans le journal.",
      true,
    ),
    audit(c, "schedule.stopped", s.pool_id, s.id),
  ]);
  return c.json({ ok: true });
});
planning.post("/pools/:id/appointments", async (c) => {
  const p = await access(c, c.req.param("id"));
  professionalAccess(c, p);
  const b = await c.req.json(),
    d = date(b.date),
    id = uid();
  if (p.access_until && d > p.access_until.slice(0, 10))
    fail("Ce rendez-vous dépasse ton autorisation.");
  await c.env.DB.batch([
    stmt(
      c,
      "INSERT INTO appointments(id,pool_id,pro_id,date,time,title,duration) VALUES(?,?,?,?,?,?,?)",
      id,
      p.id,
      who(c).id,
      d,
      clock(b.time),
      str(b.title, 120) || "Entretien",
      number(b.duration, 5, 1440, 45),
    ),
    notifyPool(c, p.id, "planning", "Un passage a été planifié", d, true),
    audit(c, "appointment.created", p.id, id),
  ]);
  return c.json({ id }, 201);
});
planning.post("/schedules/:id/occurrence", async (c) => {
  const s = await row<any>(
    c,
    "SELECT * FROM schedules WHERE id=? AND pro_id=?",
    c.req.param("id"),
    who(c).id,
  );
  if (!s) fail("Planning inaccessible.", 404);
  const p = await access(c, s.pool_id);
  professionalAccess(c, p);
  const b = await c.req.json(),
    d = date(b.date);
  if (!occurs(s, d) || (p.access_until && d > p.access_until.slice(0, 10)))
    fail("Ce passage ne correspond pas au planning.");
  const id = uid();
  await stmt(
    c,
    "INSERT OR IGNORE INTO appointments(id,pool_id,pro_id,schedule_id,original_date,date,time,title,duration) VALUES(?,?,?,?,?,?,?,?,?)",
    id,
    s.pool_id,
    who(c).id,
    s.id,
    d,
    d,
    s.time,
    s.title,
    s.duration,
  ).run();
  return c.json(
    await row(
      c,
      "SELECT * FROM appointments WHERE schedule_id=? AND original_date=?",
      s.id,
      d,
    ),
  );
});
planning.put("/appointments/:id", async (c) => {
  const a = await row<any>(
    c,
    "SELECT * FROM appointments WHERE id=? AND pro_id=?",
    c.req.param("id"),
    who(c).id,
  );
  if (!a) fail("Rendez-vous inaccessible.", 404);
  const p = await access(c, a.pool_id);
  professionalAccess(c, p);
  if (a.status === "done") fail("Un passage effectué reste dans l’historique.");
  const b = await c.req.json(),
    d = date(b.date),
    status = choice(b.status, ["planned", "cancelled"] as const, "planned");
  if (p.access_until && d > p.access_until.slice(0, 10))
    fail("Le report dépasse ton accès.");
  await c.env.DB.batch([
    stmt(
      c,
      "UPDATE appointments SET date=?,time=?,status=?,reason=? WHERE id=? AND status!=?",
      d,
      clock(b.time),
      status,
      str(b.reason, 500),
      a.id,
      "done",
    ),
    notifyPool(
      c,
      p.id,
      "planning",
      status === "cancelled"
        ? "Un passage a été annulé"
        : "Un passage a été déplacé",
      `${d} · ${str(b.reason, 500)}`,
      true,
    ),
    audit(c, "appointment.updated", p.id, a.id),
  ]);
  return c.json({ ok: true });
});
planning.get("/planning", async (c) => {
  const from = date(c.req.query("from")),
    to = date(c.req.query("to"));
  if (to < from || day(to).getTime() - day(from).getTime() > 62 * 86400000)
    fail("Choisis une période de 62 jours maximum.");
  const poolId = str(c.req.query("pool_id"), 36);
  if (poolId) await access(c, poolId);
  else if (!who(c).is_pro) fail("Sélectionne une piscine.", 403);
  const ownerFilter = poolId ? "s.pool_id=?" : "s.pro_id=?",
    apFilter = poolId ? "a.pool_id=?" : "a.pro_id=?",
    filterArg = poolId || who(c).id;
  const ss = await rows(
    c,
    `SELECT s.*,p.name pool_name,p.city,p.address,u.name pro_name,m.expires_at access_until FROM schedules s JOIN pools p ON p.id=s.pool_id JOIN users u ON u.id=s.pro_id JOIN pool_members m ON m.pool_id=s.pool_id AND m.user_id=s.pro_id WHERE ${ownerFilter} AND s.active=1 AND s.start_date<=? AND (s.end_date IS NULL OR s.end_date>=?) AND p.archived_at IS NULL AND ${ACTIVE} LIMIT 1001`,
    filterArg,
    to,
    from,
  );
  if (ss.length > 1000)
    fail("Affinez la période ou sélectionnez une piscine.", 413);
  const aa = await rows(
    c,
    `SELECT a.*,p.name pool_name,p.city,p.address,u.name pro_name FROM appointments a JOIN pools p ON p.id=a.pool_id JOIN users u ON u.id=a.pro_id JOIN pool_members m ON m.pool_id=a.pool_id AND m.user_id=a.pro_id WHERE ${apFilter} AND ((a.date>=? AND a.date<=?) OR (a.original_date>=? AND a.original_date<=?)) AND p.archived_at IS NULL AND ${ACTIVE} LIMIT 2001`,
    filterArg,
    from,
    to,
    from,
    to,
  );
  if (aa.length > 2000) fail("Trop de rendez-vous pour cette période.", 413);
  const exceptions = new Set(
    aa
      .filter((a) => a.schedule_id)
      .map((a) => `${a.schedule_id}:${a.original_date}`),
  );
  const items = aa.filter((a) => a.date >= from && a.date <= to);
  for (const s of ss) {
    for (
      let d = day(from);
      dayString(d) <= to;
      d.setUTCDate(d.getUTCDate() + 1)
    ) {
      const iso = dayString(d);
      if (
        occurs(s, iso) &&
        !exceptions.has(`${s.id}:${iso}`) &&
        (!s.access_until || iso <= s.access_until.slice(0, 10))
      )
        items.push({
          id: `${s.id}:${iso}`,
          schedule_id: s.id,
          pool_id: s.pool_id,
          pool_name: s.pool_name,
          city: s.city,
          address: s.address,
          pro_id: s.pro_id,
          pro_name: s.pro_name,
          date: iso,
          time: s.time,
          title: s.title,
          duration: s.duration,
          status: "planned",
          virtual: true,
        });
    }
  }
  items.sort((a, b) =>
    `${a.date}${a.time}`.localeCompare(`${b.date}${b.time}`),
  );
  return c.json({ items });
});
planning.get("/preparation", async (c) => {
  if (!who(c).is_pro) fail("Espace professionnel.", 403);
  const to = date(c.req.query("to"));
  return c.json({
    items: await rows(
      c,
      `SELECT n.*,p.name pool_name,p.city FROM needs n JOIN pools p ON p.id=n.pool_id JOIN pool_members m ON m.pool_id=n.pool_id WHERE m.user_id=? AND m.kind='principal' AND ${ACTIVE} AND p.archived_at IS NULL AND n.status IN('needed','ready') AND (n.due_date IS NULL OR n.due_date<=?) ORDER BY n.responsible,n.due_date,n.title LIMIT 300`,
      who(c).id,
      to,
    ),
  });
});

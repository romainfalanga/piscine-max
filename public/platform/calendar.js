// Civil dates use UTC noon so month boundaries never depend on DST or device time.
const date = (iso) => new Date(iso + "T12:00:00Z");
const iso = (d) => d.toISOString().slice(0, 10);
export const shiftDay = (value, n) => {
  const d = date(value);
  d.setUTCDate(d.getUTCDate() + n);
  return iso(d);
};
export function period(value, view) {
  const d = date(value);
  if (view === 6) {
    const from = shiftDay(value, -((d.getUTCDay() + 6) % 7));
    return { from, to: shiftDay(from, 6) };
  }
  if (view === 29)
    return {
      from: iso(new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), 1, 12))),
      to: iso(
        new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth() + 1, 0, 12)),
      ),
    };
  return { from: value, to: value };
}
export function shiftPeriod(value, view, direction) {
  if (view !== 29) return shiftDay(value, direction * (view === 6 ? 7 : 1));
  const d = date(value),
    day = d.getUTCDate();
  d.setUTCDate(1);
  d.setUTCMonth(d.getUTCMonth() + direction);
  const last = new Date(
    Date.UTC(d.getUTCFullYear(), d.getUTCMonth() + 1, 0, 12),
  ).getUTCDate();
  d.setUTCDate(Math.min(day, last));
  return iso(d);
}
export function calendarDays(value, view) {
  const range = period(value, view);
  const from = view === 29 ? period(range.from, 6).from : range.from;
  const to = view === 29 ? period(range.to, 6).to : range.to;
  const days = [];
  for (let day = from; day <= to; day = shiftDay(day, 1)) days.push(day);
  return days;
}

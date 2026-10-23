import test from "node:test";
import assert from "node:assert/strict";
import {
  period,
  shiftPeriod,
  calendarDays,
} from "../public/platform/calendar.js";

test("Agenda uses Monday weeks and actual civil months, including leap years", () => {
  assert.deepEqual(period("2026-11-01", 6), {
    from: "2026-10-26",
    to: "2026-11-01",
  });
  assert.deepEqual(period("2026-01-31", 29), {
    from: "2026-01-01",
    to: "2026-01-31",
  });
  assert.deepEqual(period("2028-02-12", 29), {
    from: "2028-02-01",
    to: "2028-02-29",
  });
  assert.deepEqual(period("2026-02-12", 29), {
    from: "2026-02-01",
    to: "2026-02-28",
  });
  assert.equal(shiftPeriod("2026-01-31", 29, 1), "2026-02-28");
  assert.equal(shiftPeriod("2026-12-31", 29, 1), "2027-01-31");
  assert.equal(shiftPeriod("2026-03-29", 6, 1), "2026-04-05");
  assert.equal(shiftPeriod("2026-10-25", 0, 1), "2026-10-26");
  const days = calendarDays("2026-02-12", 29);
  assert.equal(days.length, 35);
  assert.equal(days[0], "2026-01-26");
  assert.equal(days.at(-1), "2026-03-01");
  assert.equal(calendarDays("2026-08-01", 29).length, 42);
});

import { test } from "node:test";
import assert from "node:assert/strict";
import { calculate, CALCULATORS } from "../public/platform/calculations.js";
const near = (a, b) => assert.ok(Math.abs(a - b) < 1e-8, `${a} != ${b}`);
test("Calculator results respect explicit units across all 16 tools", () => {
  assert.equal(CALCULATORS.length, 16);
  near(
    calculate("volume", { shape: "rect", length: 8, width: 4, depth: 1.5 })
      .value,
    48,
  );
  near(
    calculate("volume", { shape: "round", length: 4, depth: 1.5 }).value,
    Math.PI * 6,
  );
  near(
    calculate("volume", { shape: "oval", length: 8, width: 4, depth: 1.5 })
      .value,
    Math.PI * 12,
  );
  near(calculate("volume", { shape: "area", area: 32, depth: 1.5 }).value, 48);
  near(
    calculate("dose", { volume: 50, dose: 100, reference: 10, unit: "g" })
      .value,
    500,
  );
  near(
    calculate("adjustment", {
      parameter: "ph",
      direction: "down",
      volume: 50,
      current: 7.6,
      target: 7.2,
      dose: 100,
      unit: "g",
      reference: 10,
      step: 0.1,
    }).value,
    2000,
  );
  near(
    calculate("salt", { volume: 50, current: 3, target: 4, purity: 100 }).value,
    50,
  );
  near(
    calculate("chlorine", {
      volume: 50,
      current: 1,
      target: 2,
      form: "liquid",
      strength: 100,
    }).value,
    500,
  );
  near(
    calculate("chlorine", {
      volume: 50,
      current: 1,
      target: 2,
      form: "solid",
      strength: 50,
    }).value,
    100,
  );
  near(calculate("combined", { free: 1, total: 1.4 }).value, 0.4);
  near(
    calculate("renewal", { volume: 50, current: 100, target: 50, fill: 0 })
      .value,
    50,
  );
  near(calculate("topup", { area: 32, height: 5 }).value, 1600);
  near(calculate("fill", { volume: 3, flow: 25 }).value, 2);
  near(calculate("turnover", { volume: 48, flow: 12, cycles: 2 }).value, 8);
  near(calculate("flow", { volume: 48, hours: 8, cycles: 2 }).value, 12);
  near(
    calculate("filter", { diameter: 60, flow: 12 }).value,
    12 / (Math.PI * 0.3 ** 2),
  );
  near(calculate("pressure", { clean: 0.8, current: 1.1 }).value, 0.3);
  near(
    calculate("energy", { power: 1000, hours: 8, days: 30, price: 0.25 }).value,
    60,
  );
  near(
    calculate("heating", { volume: 50, current: 20, target: 22, power: 10 })
      .value,
    116.3,
  );
  near(
    calculate("tour", { visits: 4, minutes: 45, travel: 60, margin: 30 }).value,
    4.5,
  );
});
test("Calculators reject invalid physical inputs, mixed directions and missing units", () => {
  for (const values of [
    { shape: "rect", length: 8, width: 0, depth: 1.5 },
    { shape: "round", length: "", depth: 1.5 },
    { shape: "toString", length: 8, width: 4, depth: 1.5 },
  ])
    assert.throws(() => calculate("volume", values));
  assert.throws(() =>
    calculate("salt", { volume: 50, current: 5, target: 4, purity: 100 }),
  );
  assert.throws(() =>
    calculate("salt", { volume: 50, current: 3, target: 4, purity: 0 }),
  );
  assert.throws(() =>
    calculate("chlorine", {
      volume: 50,
      current: 1,
      target: 2,
      form: "solid",
      strength: 120,
    }),
  );
  assert.throws(() => calculate("combined", { free: 2, total: 1 }));
  assert.throws(() =>
    calculate("renewal", { volume: 50, current: 50, target: 20, fill: 30 }),
  );
  assert.throws(() =>
    calculate("turnover", { volume: 48, flow: 0, cycles: 1 }),
  );
  assert.throws(() =>
    calculate("tour", { visits: 1.5, minutes: 45, travel: 60, margin: 30 }),
  );
  assert.throws(() =>
    calculate("adjustment", {
      parameter: "ph",
      direction: "down",
      volume: 50,
      current: 7,
      target: 8,
      dose: 100,
      unit: "g",
      reference: 10,
      step: 0.1,
    }),
  );
  near(
    calculate("salt", { volume: 50, current: 4, target: 4, purity: 100 }).value,
    0,
  );
  near(calculate("pressure", { clean: 0, current: 0 }).value, 0);
});

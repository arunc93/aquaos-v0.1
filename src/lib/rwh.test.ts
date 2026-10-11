import assert from "node:assert/strict";
import test from "node:test";
import { annualHarvestLitres } from "./rwh";

test("1,000 sq ft roof in Bengaluru at coefficient 0.80", () => {
  // 1000 * 0.092903 * 970 * 0.80 = 72092.728, rounded
  assert.equal(annualHarvestLitres(1000, "sqft", "Bengaluru"), 72093);
});

test("square metres skip the conversion", () => {
  assert.equal(annualHarvestLitres(100, "sqm", "Chennai"), Math.round(100 * 1400 * 0.8));
});

test("unknown city or empty area returns null", () => {
  assert.equal(annualHarvestLitres(1000, "sqft", "Mysuru"), null);
  assert.equal(annualHarvestLitres(0, "sqm", "Pune"), null);
});

import assert from "node:assert/strict";
import test from "node:test";
import { tdsChartLayout } from "./tds-chart";

test("later readings sit to the right and higher TDS sits higher", () => {
  const chart = tdsChartLayout([
    { testedAt: "2026-10-10", tds: 540 },
    { testedAt: "2026-10-01", tds: 320 },
  ]);
  const earlier = chart.points.find((point) => point.testedAt === "2026-10-01");
  const later = chart.points.find((point) => point.testedAt === "2026-10-10");
  assert.ok(earlier && later);
  assert.ok(earlier.x < later.x);
  assert.ok(later.y < earlier.y);
  assert.equal(chart.yMax, 600);
  assert.ok(chart.referenceY > later.y);
  assert.ok(chart.referenceY < earlier.y);
});

test("one reading is kept inside the plot", () => {
  const chart = tdsChartLayout([{ testedAt: "2026-10-01", tds: 320 }]);
  assert.equal(chart.points.length, 1);
  assert.ok(chart.points[0].x > 44);
  assert.ok(chart.points[0].x < 640);
  assert.equal(chart.yMax, 500);
});

test("no readings produce no points", () => {
  assert.equal(tdsChartLayout([]).points.length, 0);
});

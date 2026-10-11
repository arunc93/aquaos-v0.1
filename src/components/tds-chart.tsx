import { formatDay } from "@/lib/format";
import { tdsChartLayout, TDS_REFERENCE, type TdsReading } from "@/lib/tds-chart";

export function TdsChart({ readings }: { readings: TdsReading[] }) {
  const chart = tdsChartLayout(readings);
  if (chart.points.length === 0) return null;
  const line = chart.points.map((point) => `${point.x},${point.y}`).join(" ");
  const first = chart.points[0];
  const last = chart.points[chart.points.length - 1];

  return (
    <section className="rounded-lg border border-border bg-card p-4">
      <h2 className="text-xl font-semibold">TDS trend</h2>
      <p className="mt-1 text-sm text-muted-foreground">
        Latest {last.tds} on {formatDay(last.testedAt)}. The line at {TDS_REFERENCE} is the usual drinking-water mark.
      </p>
      <svg
        viewBox={`0 0 ${chart.width} ${chart.height}`}
        role="img"
        aria-label={`TDS from ${first.tds} to ${last.tds}`}
        className="mt-3 h-auto w-full"
      >
        {chart.ticks.map((tick) => (
          <g key={tick}>
            <line
              x1={chart.axisLeft}
              x2={chart.width - 16}
              y1={chart.tickY(tick)}
              y2={chart.tickY(tick)}
              stroke="#c9dbdc"
            />
            <text x={chart.axisLeft - 8} y={chart.tickY(tick) + 4} textAnchor="end" fill="#3d5558" fontSize="12">
              {tick}
            </text>
          </g>
        ))}
        <line
          x1={chart.axisLeft}
          x2={chart.width - 16}
          y1={chart.referenceY}
          y2={chart.referenceY}
          stroke="#b45309"
          strokeDasharray="4 4"
        />
        {chart.points.length > 1 ? (
          <polyline fill="none" stroke="#0f6e75" strokeWidth="2.5" points={line} />
        ) : null}
        {chart.points.map((point, index) => (
          <circle key={`${point.testedAt}-${index}`} cx={point.x} cy={point.y} r="4.5" fill="#0f6e75">
            <title>{`${formatDay(point.testedAt)}: ${point.tds}`}</title>
          </circle>
        ))}
        <text x={first.x} y={chart.height - 8} textAnchor="start" fill="#3d5558" fontSize="12">
          {formatDay(first.testedAt)}
        </text>
        {chart.points.length > 1 ? (
          <text x={last.x} y={chart.height - 8} textAnchor="end" fill="#3d5558" fontSize="12">
            {formatDay(last.testedAt)}
          </text>
        ) : null}
      </svg>
    </section>
  );
}

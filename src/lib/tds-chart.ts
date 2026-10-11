export const TDS_REFERENCE = 500;

export type TdsReading = {
  testedAt: string;
  tds: number;
};

export type TdsPlot = {
  x: number;
  y: number;
  tds: number;
  testedAt: string;
};

const WIDTH = 640;
const HEIGHT = 220;
const PAD = { left: 44, right: 16, top: 16, bottom: 32 };

export function tdsChartLayout(readings: TdsReading[]) {
  const innerWidth = WIDTH - PAD.left - PAD.right;
  const innerHeight = HEIGHT - PAD.top - PAD.bottom;
  const sorted = [...readings].sort((a, b) => a.testedAt.localeCompare(b.testedAt) || a.tds - b.tds);
  const peak = sorted.reduce((max, reading) => Math.max(max, reading.tds), TDS_REFERENCE);
  const yMax = Math.ceil(peak / 100) * 100;
  const times = sorted.map((reading) => Date.parse(reading.testedAt));
  const first = times[0] ?? 0;
  const last = times[times.length - 1] ?? first;
  const span = last - first;
  const points: TdsPlot[] = sorted.map((reading, index) => {
    const along = span === 0 ? (sorted.length === 1 ? 0.5 : index / (sorted.length - 1)) : (times[index] - first) / span;
    return {
      testedAt: reading.testedAt,
      tds: reading.tds,
      x: PAD.left + along * innerWidth,
      y: PAD.top + (1 - reading.tds / yMax) * innerHeight,
    };
  });
  const yFor = (tds: number) => PAD.top + (1 - tds / yMax) * innerHeight;
  return {
    width: WIDTH,
    height: HEIGHT,
    yMax,
    points,
    referenceY: yFor(TDS_REFERENCE),
    ticks: [0, yMax / 2, yMax],
    tickY: (tds: number) => yFor(tds),
    axisLeft: PAD.left,
    axisBottom: HEIGHT - PAD.bottom,
  };
}

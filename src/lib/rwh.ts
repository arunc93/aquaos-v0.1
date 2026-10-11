/** Planning rainfall (mm), not a live weather feed. */
export const RAINFALL_MM: Record<string, number> = {
  Bengaluru: 970,
  Chennai: 1400,
  Hyderabad: 820,
  "Delhi NCR": 800,
  Pune: 720,
};

export const CITIES = Object.keys(RAINFALL_MM);

/** Concrete or tile roof. */
export const RUNOFF_COEFFICIENT = 0.8;

export type AreaUnit = "sqft" | "sqm";

export function annualHarvestLitres(
  area: number,
  unit: AreaUnit,
  city: string,
): number | null {
  const rainfall = RAINFALL_MM[city];
  if (rainfall === undefined || !Number.isFinite(area) || area <= 0) {
    return null;
  }
  const areaM2 = unit === "sqft" ? area * 0.092903 : area;
  return Math.round(areaM2 * rainfall * RUNOFF_COEFFICIENT);
}

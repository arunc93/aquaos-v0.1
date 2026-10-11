const WHEN = new Intl.DateTimeFormat("en-IN", {
  timeZone: "Asia/Kolkata",
  day: "numeric",
  month: "short",
  year: "numeric",
  hour: "numeric",
  minute: "2-digit",
});

const DAY = new Intl.DateTimeFormat("en-IN", {
  timeZone: "Asia/Kolkata",
  day: "numeric",
  month: "short",
  year: "numeric",
});

export function formatWhen(iso: string): string {
  return WHEN.format(new Date(iso));
}

export function formatDay(iso: string): string {
  return DAY.format(new Date(iso));
}

/** First instant of the current month in Asia/Kolkata, as an ISO string. */
export function istMonthStartIso(now = new Date()): string {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Kolkata",
    year: "numeric",
    month: "2-digit",
  }).formatToParts(now);
  const year = parts.find((part) => part.type === "year")?.value;
  const month = parts.find((part) => part.type === "month")?.value;
  if (!year || !month) {
    throw new Error("Could not resolve the current month in IST");
  }
  return new Date(`${year}-${month}-01T00:00:00+05:30`).toISOString();
}

const SLOT_HOUR: Record<string, string> = {
  Morning: "09:00:00",
  Afternoon: "14:00:00",
  Evening: "18:00:00",
};

/** Combine a yyyy-mm-dd date and a slot into an IST timestamp. */
export function slotToIso(date: string, slot: string): string | null {
  const hour = SLOT_HOUR[slot];
  if (!hour || !/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    return null;
  }
  const instant = new Date(`${date}T${hour}+05:30`);
  if (Number.isNaN(instant.getTime())) {
    return null;
  }
  return instant.toISOString();
}

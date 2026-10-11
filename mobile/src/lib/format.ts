const WHEN = new Intl.DateTimeFormat("en-IN", {
  timeZone: "Asia/Kolkata",
  day: "numeric",
  month: "short",
  year: "numeric",
  hour: "numeric",
  minute: "2-digit",
});

export function formatWhen(iso: string): string {
  return WHEN.format(new Date(iso));
}

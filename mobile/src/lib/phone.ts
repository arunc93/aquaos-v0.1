export function formatPhone(e164: string): string {
  const local = e164.replace(/^\+91/, "");
  if (local.length !== 10) {
    return e164;
  }
  return `+91 ${local.slice(0, 5)} ${local.slice(5)}`;
}

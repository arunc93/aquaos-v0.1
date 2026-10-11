/** Accept a 10-digit Indian mobile, with or without +91 or 91, and return E.164. */
export function toE164(input: string): string | null {
  const digits = input.replace(/\D/g, "");
  let local = digits;
  if (digits.length === 12 && digits.startsWith("91")) {
    local = digits.slice(2);
  } else if (digits.length === 11 && digits.startsWith("0")) {
    local = digits.slice(1);
  }
  if (!/^[6-9]\d{9}$/.test(local)) {
    return null;
  }
  return `+91${local}`;
}

export function formatPhone(e164: string): string {
  const local = e164.replace(/^\+91/, "");
  if (local.length !== 10) {
    return e164;
  }
  return `+91 ${local.slice(0, 5)} ${local.slice(5)}`;
}

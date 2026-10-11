export const ROLES = ["society_admin", "resident", "vendor", "super_admin"] as const;
export type Role = (typeof ROLES)[number];

export const BOOKING_STATUSES = [
  "requested",
  "confirmed",
  "in_transit",
  "delivered",
  "cancelled",
] as const;
export type BookingStatus = (typeof BOOKING_STATUSES)[number];

export const STATUS_LABEL: Record<BookingStatus, string> = {
  requested: "Requested",
  confirmed: "Confirmed",
  in_transit: "In transit",
  delivered: "Delivered",
  cancelled: "Cancelled",
};

/**
 * Mirrors the booking state machine enforced by transition_booking.
 * Delivered still requires a matching OTP and a proof path in the database.
 */
export function canTransition(role: Role, from: BookingStatus, to: BookingStatus): boolean {
  if (role === "society_admin") {
    if (from === "requested" && (to === "confirmed" || to === "cancelled")) return true;
    if ((from === "confirmed" || from === "in_transit") && to === "cancelled") return true;
    return false;
  }
  if (role === "vendor") {
    if (from === "requested" && to === "confirmed") return true;
    if (from === "confirmed" && to === "in_transit") return true;
    if (from === "in_transit" && to === "delivered") return true;
    return false;
  }
  return false;
}

export function homePath(profile: { role: Role; society_id: string | null }): string {
  if (profile.role === "super_admin") return "/platform";
  if (profile.role === "vendor") return "/vendor";
  if (profile.role === "resident" && profile.society_id) return "/resident";
  if (profile.role === "society_admin" && profile.society_id) return "/";
  return "/onboarding";
}

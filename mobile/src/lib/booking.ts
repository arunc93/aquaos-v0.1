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

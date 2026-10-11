import { z } from "zod";
import { BOOKING_STATUSES, ROLES } from "@/lib/booking";

export const profileSchema = z.object({
  id: z.uuid(),
  role: z.enum(ROLES),
  society_id: z.uuid().nullable(),
  vendor_id: z.uuid().nullable(),
  full_name: z.string(),
  phone: z.string(),
  flat_number: z.string().nullable(),
});

export type Profile = z.infer<typeof profileSchema>;

export const societySchema = z.object({
  id: z.uuid(),
  name: z.string(),
  address: z.string(),
  city: z.string(),
  pincode: z.string(),
  unit_count: z.coerce.number(),
  tank_capacity_kl: z.coerce.number(),
});

export type Society = z.infer<typeof societySchema>;

export const priceSchema = z.object({
  capacity_kl: z.coerce.number(),
  price_inr: z.coerce.number(),
});

export const vendorSchema = z.object({
  id: z.uuid(),
  name: z.string(),
  phone: z.string(),
  vehicle_number: z.string(),
  base_city: z.string(),
  rating: z.coerce.number(),
  reliability_score: z.coerce.number(),
  verification_status: z.enum(["pending", "verified", "rejected"]),
  quality_badge: z.enum(["none", "verified", "premium"]),
  typical_eta_hours: z.coerce.number(),
  last_delivery_photo_path: z.string().nullable(),
  vendor_prices: z.array(priceSchema),
});

export type Vendor = z.infer<typeof vendorSchema>;

export const bookingSchema = z.object({
  id: z.uuid(),
  society_id: z.uuid(),
  vendor_id: z.uuid(),
  capacity_kl: z.coerce.number(),
  price_inr: z.coerce.number(),
  status: z.enum(BOOKING_STATUSES),
  scheduled_at: z.string(),
  slot_label: z.string(),
  delivered_at: z.string().nullable(),
  proof_path: z.string().nullable(),
  otp: z.string(),
  notes: z.string().nullable(),
  vendor_name: z.string(),
  vendor_phone: z.string(),
});

export type Booking = z.infer<typeof bookingSchema>;

export const deliverySchema = z.object({
  id: z.uuid(),
  vendor_name: z.string(),
  capacity_kl: z.coerce.number(),
  price_inr: z.coerce.number(),
  status: z.enum(BOOKING_STATUSES),
  scheduled_at: z.string(),
  slot_label: z.string(),
  delivered_at: z.string().nullable(),
  proof_path: z.string().nullable(),
});

export type Delivery = z.infer<typeof deliverySchema>;

export function parseRows<T>(schema: z.ZodType<T>, rows: unknown): T[] {
  const parsed = z.array(schema).safeParse(rows ?? []);
  if (!parsed.success) {
    throw new Error("The database returned a row this screen does not understand.");
  }
  return parsed.data;
}

export function parseOne<T>(schema: z.ZodType<T>, row: unknown): T {
  const parsed = schema.safeParse(row);
  if (!parsed.success) {
    throw new Error("The database returned a row this screen does not understand.");
  }
  return parsed.data;
}

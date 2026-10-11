import { signedUrl } from "@/lib/auth";
import { embedded } from "@/lib/rows";
import { bookingSchema, parseOne, parseRows, societySchema, vendorSchema, type Booking, type Society, type Vendor } from "@/lib/schemas";
import { createClient } from "@/lib/supabase/server";

const BOOKING_COLUMNS =
  "id, society_id, vendor_id, capacity_kl, price_inr, status, scheduled_at, slot_label, delivered_at, proof_path, otp, notes, vendors(name, phone)";

export function mapBooking(row: Record<string, unknown>): Booking {
  const vendor = embedded(row.vendors as { name?: string; phone?: string } | { name?: string; phone?: string }[] | null);
  const { vendors: _vendors, ...rest } = row;
  return parseOne(bookingSchema, {
    ...rest,
    vendor_name: vendor?.name ?? "Vendor",
    vendor_phone: vendor?.phone ?? "",
  });
}

export async function loadSociety(societyId: string): Promise<Society> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("societies")
    .select("id, name, address, city, pincode, unit_count, tank_capacity_kl")
    .eq("id", societyId)
    .single();
  if (error || !data) {
    throw new Error(error?.message ?? "Society not found");
  }
  return parseOne(societySchema, data);
}

export async function loadBookings(column: "society_id" | "vendor_id", id: string): Promise<Booking[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("bookings")
    .select(BOOKING_COLUMNS)
    .eq(column, id)
    .order("scheduled_at", { ascending: false });
  if (error) {
    throw new Error(error.message);
  }
  return (data ?? []).map((row) => mapBooking(row as Record<string, unknown>));
}

export async function loadBooking(id: string): Promise<Booking | null> {
  const supabase = await createClient();
  const { data, error } = await supabase.from("bookings").select(BOOKING_COLUMNS).eq("id", id).maybeSingle();
  if (error) {
    throw new Error(error.message);
  }
  if (!data) return null;
  return mapBooking(data as Record<string, unknown>);
}

export async function loadVendors(): Promise<Vendor[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("vendors")
    .select(
      "id, name, phone, vehicle_number, base_city, rating, reliability_score, verification_status, quality_badge, typical_eta_hours, last_delivery_photo_path, vendor_prices(capacity_kl, price_inr)",
    )
    .eq("verification_status", "verified")
    .order("name");
  if (error) {
    throw new Error(error.message);
  }
  return parseRows(vendorSchema, data ?? []);
}

export async function proofUrl(path: string | null): Promise<string | null> {
  return signedUrl("delivery-proofs", path);
}

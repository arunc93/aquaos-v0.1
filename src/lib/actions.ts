"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { getProfile } from "@/lib/auth";
import { homePath, type BookingStatus } from "@/lib/booking";
import { slotToIso } from "@/lib/format";
import { toE164 } from "@/lib/phone";
import { annualHarvestLitres, CITIES, RAINFALL_MM, RUNOFF_COEFFICIENT, type AreaUnit } from "@/lib/rwh";
import { createClient } from "@/lib/supabase/server";

export type ActionState = { error?: string; notice?: string } | null;

function field(formData: FormData, name: string): string {
  const value = formData.get(name);
  return typeof value === "string" ? value.trim() : "";
}

async function requireProfile() {
  const profile = await getProfile();
  if (!profile) {
    redirect("/login");
  }
  return profile;
}

export async function signIn(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const parsed = z
    .object({ email: z.email(), password: z.string().min(8) })
    .safeParse({ email: field(formData, "email"), password: field(formData, "password") });
  if (!parsed.success) {
    return { error: "Enter a valid email and a password of at least 8 characters." };
  }
  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword(parsed.data);
  if (error) {
    return { error: "Email or password is incorrect." };
  }
  const profile = await getProfile();
  if (!profile) {
    return { error: "This account has no profile yet." };
  }
  redirect(homePath(profile));
}

export async function signUp(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const phone = toE164(field(formData, "phone"));
  const parsed = z
    .object({
      fullName: z.string().min(2).max(80),
      email: z.email(),
      password: z.string().min(8),
      inviteCode: z.string().max(6),
    })
    .safeParse({
      fullName: field(formData, "full_name"),
      email: field(formData, "email"),
      password: field(formData, "password"),
      inviteCode: field(formData, "invite_code").toUpperCase(),
    });
  if (!phone) {
    return { error: "Enter a 10-digit Indian mobile number." };
  }
  if (!parsed.success) {
    return { error: "Check your name, email, and password (8 or more characters)." };
  }

  const supabase = await createClient();
  const { data, error } = await supabase.auth.signUp({
    email: parsed.data.email,
    password: parsed.data.password,
    options: {
      data: { full_name: parsed.data.fullName, phone, role: "resident" },
    },
  });
  if (error) {
    return { error: error.message };
  }
  if (!data.session) {
    return {
      error: "Confirm the email address, then sign in. For a pilot, turn off email confirmation in Supabase Auth.",
    };
  }
  if (parsed.data.inviteCode) {
    const { error: inviteError } = await supabase.rpc("accept_invite", {
      p_code: parsed.data.inviteCode,
    });
    if (inviteError) {
      return { error: inviteError.message };
    }
    redirect("/resident");
  }
  redirect("/onboarding");
}

export async function signOut() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/login");
}

export async function createSociety(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const parsed = z
    .object({
      name: z.string().min(2).max(120),
      address: z.string().min(4).max(300),
      city: z.string().min(2).max(80),
      pincode: z.string().regex(/^[1-9][0-9]{5}$/),
      unitCount: z.coerce.number().int().positive(),
      tankCapacity: z.coerce.number().positive(),
    })
    .safeParse({
      name: field(formData, "name"),
      address: field(formData, "address"),
      city: field(formData, "city"),
      pincode: field(formData, "pincode"),
      unitCount: field(formData, "unit_count"),
      tankCapacity: field(formData, "tank_capacity_kl"),
    });
  if (!parsed.success) {
    return { error: "Check the society name, address, 6-digit pincode, unit count, and tank capacity." };
  }
  const supabase = await createClient();
  const { error } = await supabase.rpc("create_society", {
    p_name: parsed.data.name,
    p_address: parsed.data.address,
    p_city: parsed.data.city,
    p_pincode: parsed.data.pincode,
    p_unit_count: parsed.data.unitCount,
    p_tank_capacity_kl: parsed.data.tankCapacity,
  });
  if (error) {
    return { error: error.message };
  }
  redirect("/");
}

export async function acceptInvite(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const code = field(formData, "code").toUpperCase();
  if (!/^[A-Z0-9]{6}$/.test(code)) {
    return { error: "Enter the 6-character invite code." };
  }
  const supabase = await createClient();
  const { error } = await supabase.rpc("accept_invite", { p_code: code });
  if (error) {
    return { error: error.message };
  }
  redirect("/resident");
}

export async function updateSociety(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const profile = await requireProfile();
  if (profile.role !== "society_admin" || !profile.society_id) {
    return { error: "Only a society admin can change these settings." };
  }
  const parsed = z
    .object({
      name: z.string().min(2).max(120),
      address: z.string().min(4).max(300),
      city: z.string().min(2).max(80),
      pincode: z.string().regex(/^[1-9][0-9]{5}$/),
      unitCount: z.coerce.number().int().positive(),
      tankCapacity: z.coerce.number().positive(),
    })
    .safeParse({
      name: field(formData, "name"),
      address: field(formData, "address"),
      city: field(formData, "city"),
      pincode: field(formData, "pincode"),
      unitCount: field(formData, "unit_count"),
      tankCapacity: field(formData, "tank_capacity_kl"),
    });
  if (!parsed.success) {
    return { error: "Check the society details and try again." };
  }
  const supabase = await createClient();
  const { error } = await supabase
    .from("societies")
    .update({
      name: parsed.data.name,
      address: parsed.data.address,
      city: parsed.data.city,
      pincode: parsed.data.pincode,
      unit_count: parsed.data.unitCount,
      tank_capacity_kl: parsed.data.tankCapacity,
    })
    .eq("id", profile.society_id);
  if (error) {
    return { error: error.message };
  }
  revalidatePath("/settings");
  revalidatePath("/");
  return { notice: "Society settings saved." };
}

export async function recordTankLevel(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const level = Number(field(formData, "level_percent"));
  const notes = field(formData, "notes");
  const supabase = await createClient();
  const { error } = await supabase.rpc("record_tank_level", {
    p_level_percent: level,
    p_notes: notes,
  });
  if (error) {
    return { error: error.message };
  }
  revalidatePath("/");
  revalidatePath("/settings");
  return { notice: "Tank level recorded." };
}

export async function createBooking(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const slot = field(formData, "slot_label");
  const scheduled = slotToIso(field(formData, "date"), slot);
  if (!scheduled) {
    return { error: "Choose a delivery day and a Morning, Afternoon, or Evening slot." };
  }
  const capacity = Number(field(formData, "capacity_kl"));
  const vendorId = field(formData, "vendor_id");
  if (!z.uuid().safeParse(vendorId).success || !Number.isFinite(capacity)) {
    return { error: "Choose a tanker capacity." };
  }
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("create_booking", {
    p_vendor_id: vendorId,
    p_capacity_kl: capacity,
    p_scheduled_at: scheduled,
    p_slot_label: slot,
    p_notes: field(formData, "notes"),
  });
  if (error) {
    return { error: error.message };
  }
  revalidatePath("/bookings");
  redirect(`/bookings/${data as string}`);
}

async function transition(bookingId: string, status: BookingStatus, otp = "", proof = "") {
  const supabase = await createClient();
  const { error } = await supabase.rpc("transition_booking", {
    p_booking_id: bookingId,
    p_next_status: status,
    p_otp: otp,
    p_proof_path: proof,
  });
  return error?.message ?? null;
}

function returnPath(formData: FormData, fallback: string) {
  const value = field(formData, "return_to");
  if (value.startsWith("/vendor/") || value.startsWith("/bookings/")) {
    return value;
  }
  return fallback;
}

export async function confirmBooking(formData: FormData) {
  const id = field(formData, "booking_id");
  const next = returnPath(formData, `/bookings/${id}`);
  const message = await transition(id, "confirmed");
  if (message) {
    redirect(`${next}?error=${encodeURIComponent(message)}`);
  }
  revalidatePath("/bookings");
  revalidatePath(`/bookings/${id}`);
  revalidatePath("/vendor");
  revalidatePath(`/vendor/${id}`);
}

export async function cancelBooking(formData: FormData) {
  const id = field(formData, "booking_id");
  const next = returnPath(formData, `/bookings/${id}`);
  const message = await transition(id, "cancelled");
  if (message) {
    redirect(`${next}?error=${encodeURIComponent(message)}`);
  }
  revalidatePath("/bookings");
  revalidatePath(`/bookings/${id}`);
  revalidatePath("/vendor");
}

export async function markInTransit(formData: FormData) {
  const id = field(formData, "booking_id");
  const next = returnPath(formData, `/vendor/${id}`);
  const message = await transition(id, "in_transit");
  if (message) {
    redirect(`${next}?error=${encodeURIComponent(message)}`);
  }
  revalidatePath("/vendor");
  revalidatePath(`/vendor/${id}`);
  revalidatePath("/bookings");
}

export async function markDelivered(
  bookingId: string,
  otp: string,
  proofPath: string,
): Promise<ActionState> {
  const message = await transition(bookingId, "delivered", otp.trim(), proofPath);
  if (message) {
    return { error: message };
  }
  revalidatePath("/vendor");
  revalidatePath(`/vendor/${bookingId}`);
  revalidatePath("/bookings");
  revalidatePath(`/bookings/${bookingId}`);
  return null;
}

export async function createQualityLog(input: {
  testedAt: string;
  source: string;
  bookingId: string;
  tds: string;
  ph: string;
  notes: string;
  reportPath: string | null;
}): Promise<ActionState> {
  const profile = await requireProfile();
  if (profile.role !== "society_admin" || !profile.society_id) {
    return { error: "Only a society admin can log quality." };
  }
  const parsed = z
    .object({
      testedAt: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
      source: z.enum(["tanker", "borewell", "municipal", "other"]),
      bookingId: z.uuid().or(z.literal("")),
      tds: z.coerce.number().min(0).max(5000),
      ph: z.coerce.number().min(0).max(14),
      notes: z.string().max(1000),
    })
    .safeParse(input);
  if (!parsed.success) {
    return { error: "Enter the test date, source, TDS, and pH." };
  }
  const supabase = await createClient();
  const { error } = await supabase.from("quality_logs").insert({
    society_id: profile.society_id,
    booking_id: parsed.data.bookingId || null,
    source: parsed.data.bookingId ? "tanker" : parsed.data.source,
    tested_at: parsed.data.testedAt,
    tds: parsed.data.tds,
    ph: parsed.data.ph,
    notes: parsed.data.notes || null,
    report_path: input.reportPath,
    logged_by: profile.id,
  });
  if (error) {
    return { error: error.message };
  }
  revalidatePath("/quality");
  return null;
}

export async function resolveComplaint(formData: FormData) {
  const supabase = await createClient();
  const { error } = await supabase.rpc("resolve_complaint", {
    p_complaint_id: field(formData, "complaint_id"),
  });
  if (error) {
    redirect(`/quality?error=${encodeURIComponent(error.message)}`);
  }
  revalidatePath("/quality");
  revalidatePath("/");
}

export async function createComplaint(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const profile = await requireProfile();
  if (profile.role !== "resident" || !profile.society_id) {
    return { error: "Only a resident can send feedback." };
  }
  const ratingRaw = field(formData, "rating");
  const tdsRaw = field(formData, "tds");
  const bookingId = field(formData, "booking_id");
  const parsed = z
    .object({ message: z.string().min(4).max(1000) })
    .safeParse({ message: field(formData, "message") });
  if (!parsed.success) {
    return { error: "Describe the issue in a few words." };
  }
  const supabase = await createClient();
  const { error } = await supabase.from("complaints").insert({
    society_id: profile.society_id,
    booking_id: bookingId || null,
    created_by: profile.id,
    message: parsed.data.message,
    tds: tdsRaw ? Number(tdsRaw) : null,
    rating: ratingRaw ? Number(ratingRaw) : null,
    status: "open",
  });
  if (error) {
    return { error: error.message };
  }
  revalidatePath("/resident");
  revalidatePath("/quality");
  return { notice: "Feedback sent to the society admin." };
}

export async function saveRwh(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const profile = await requireProfile();
  if (profile.role !== "society_admin" || !profile.society_id) {
    return { error: "Only a society admin can save a calculation." };
  }
  const unit = field(formData, "area_unit");
  const city = field(formData, "city");
  const area = Number(field(formData, "roof_area"));
  if (unit !== "sqft" && unit !== "sqm") {
    return { error: "Choose square feet or square metres." };
  }
  const harvest = annualHarvestLitres(area, unit as AreaUnit, city);
  if (harvest === null || !CITIES.includes(city)) {
    return { error: "Enter a roof area and choose a city." };
  }
  const supabase = await createClient();
  const { error } = await supabase.from("rwh_calculations").insert({
    society_id: profile.society_id,
    roof_area: area,
    area_unit: unit,
    city_name: city,
    rainfall_mm: RAINFALL_MM[city],
    runoff_coefficient: RUNOFF_COEFFICIENT,
    estimated_harvest_liters: harvest,
    created_by: profile.id,
  });
  if (error) {
    return { error: error.message };
  }
  revalidatePath("/rwh");
  return { notice: `Saved. Estimated annual harvest is ${harvest.toLocaleString("en-IN")} litres.` };
}

export async function createInvite(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const phone = toE164(field(formData, "phone"));
  if (!phone) {
    return { error: "Enter a 10-digit Indian mobile number." };
  }
  const name = field(formData, "full_name");
  const flat = field(formData, "flat_number");
  if (name.length < 2 || flat.length < 1) {
    return { error: "Enter the resident's name and flat number." };
  }
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("create_invite", {
    p_full_name: name,
    p_phone: phone,
    p_flat_number: flat,
  });
  if (error) {
    return { error: error.message };
  }
  revalidatePath("/residents");
  return { notice: `Invite code: ${data as string}` };
}

export async function postAnnouncement(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const profile = await requireProfile();
  if (profile.role !== "society_admin" || !profile.society_id) {
    return { error: "Only a society admin can post an announcement." };
  }
  const title = field(formData, "title");
  const message = field(formData, "message");
  if (title.length < 2 || message.length < 2) {
    return { error: "Add a title and a message." };
  }
  const supabase = await createClient();
  const { error } = await supabase.from("announcements").insert({
    society_id: profile.society_id,
    title,
    message,
    created_by: profile.id,
  });
  if (error) {
    return { error: error.message };
  }
  revalidatePath("/residents");
  revalidatePath("/resident");
  return { notice: "Announcement posted." };
}

export async function setVendorVerification(formData: FormData) {
  const status = field(formData, "status");
  const supabase = await createClient();
  const { error } = await supabase.rpc("set_vendor_verification", {
    p_vendor_id: field(formData, "vendor_id"),
    p_status: status,
    p_badge: status === "verified" ? "verified" : "none",
  });
  if (error) {
    redirect(`/platform?error=${encodeURIComponent(error.message)}`);
  }
  revalidatePath("/platform");
  revalidatePath("/book");
}

import { readFileSync } from "node:fs";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { slotToIso } from "../src/lib/format";
import { annualHarvestLitres } from "../src/lib/rwh";

function loadEnvFile() {
  try {
    const text = readFileSync(new URL("../.env.local", import.meta.url), "utf8");
    for (const line of text.split(/\r?\n/)) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith("#")) continue;
      const eq = trimmed.indexOf("=");
      if (eq === -1) continue;
      const key = trimmed.slice(0, eq).trim();
      const value = trimmed.slice(eq + 1).trim().replace(/^"|"$/g, "");
      if (!process.env[key]) process.env[key] = value;
    }
  } catch {
    // The process environment is enough when the file is absent.
  }
}

loadEnvFile();

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !serviceKey) {
  console.error("Set NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in .env.local");
  process.exit(1);
}

const supabase = createClient(url, serviceKey, {
  auth: { persistSession: false, autoRefreshToken: false },
});

const PASSWORD = "AquaOS-pilot-2026";
const SOCIETY = "Lakeview Residency Association";
const VENDOR_NAMES = [
  "Sri Manjunatha Water Supply",
  "Kaveri Tankers",
  "East City Water Carts",
  "South Side Water Supply",
];

type DemoUser = {
  email: string;
  fullName: string;
  phone: string;
  role: "society_admin" | "resident" | "vendor" | "super_admin";
};

const USERS: DemoUser[] = [
  { email: "admin@lakeview.aquaos.demo", fullName: "Meera Rao", phone: "+919800011001", role: "society_admin" },
  { email: "resident@lakeview.aquaos.demo", fullName: "Arun Kumar", phone: "+919800011002", role: "resident" },
  { email: "vendor@manjunatha.aquaos.demo", fullName: "Ramesh Gowda", phone: "+919800011003", role: "vendor" },
  { email: "super@aquaos.demo", fullName: "AquaOS Support", phone: "+919800011004", role: "super_admin" },
];

function istDay(offset: number) {
  const today = new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Kolkata" }).format(new Date());
  const [year, month, day] = today.split("-").map(Number);
  const date = new Date(Date.UTC(year, month - 1, day + offset));
  return date.toISOString().slice(0, 10);
}

function at(offset: number, slot: "Morning" | "Afternoon" | "Evening") {
  const iso = slotToIso(istDay(offset), slot);
  if (!iso) throw new Error(`Bad slot ${slot}`);
  return iso;
}

async function reset(client: SupabaseClient) {
  const { error: societyError } = await client.from("societies").delete().eq("name", SOCIETY);
  if (societyError) throw societyError;
  const { error: vendorError } = await client.from("vendors").delete().in("name", VENDOR_NAMES);
  if (vendorError) throw vendorError;

  const emails = new Set(USERS.map((user) => user.email));
  for (let page = 1; page < 20; page += 1) {
    const listed = await client.auth.admin.listUsers({ page, perPage: 200 });
    if (listed.error) throw listed.error;
    const matches = listed.data.users.filter((user) => user.email && emails.has(user.email));
    for (const user of matches) {
      const removed = await client.auth.admin.deleteUser(user.id);
      if (removed.error) throw removed.error;
    }
    if (listed.data.users.length < 200) break;
  }
}

async function createUser(user: DemoUser) {
  const created = await supabase.auth.admin.createUser({
    email: user.email,
    password: PASSWORD,
    email_confirm: true,
    user_metadata: { full_name: user.fullName, phone: user.phone, role: user.role },
  });
  if (created.error || !created.data.user) {
    throw created.error ?? new Error(`Could not create ${user.email}`);
  }
  return created.data.user.id;
}

async function main() {
  await reset(supabase);
  const adminId = await createUser(USERS[0]);
  const residentId = await createUser(USERS[1]);
  const vendorUserId = await createUser(USERS[2]);
  await createUser(USERS[3]);

  const { data: vendorRows, error: vendorError } = await supabase
    .from("vendors")
    .insert([
      {
        name: "Sri Manjunatha Water Supply",
        phone: "+919845010101",
        vehicle_number: "KA-01-AB-4521",
        base_city: "Bengaluru",
        rating: 4.6,
        reliability_score: 92,
        verification_status: "verified",
        quality_badge: "verified",
        typical_eta_hours: 3,
      },
      {
        name: "Kaveri Tankers",
        phone: "+919845010202",
        vehicle_number: "KA-05-CD-7780",
        base_city: "Bengaluru",
        rating: 4.4,
        reliability_score: 88,
        verification_status: "verified",
        quality_badge: "premium",
        typical_eta_hours: 4,
      },
      {
        name: "East City Water Carts",
        phone: "+919845010303",
        vehicle_number: "KA-03-EF-2201",
        base_city: "Bengaluru",
        rating: 4.1,
        reliability_score: 80,
        verification_status: "verified",
        quality_badge: "none",
        typical_eta_hours: 5,
      },
      {
        name: "South Side Water Supply",
        phone: "+919845010404",
        vehicle_number: "KA-02-GH-9090",
        base_city: "Bengaluru",
        rating: 3.8,
        reliability_score: 70,
        verification_status: "pending",
        quality_badge: "none",
        typical_eta_hours: 6,
      },
    ])
    .select("id, name");
  if (vendorError || !vendorRows) throw vendorError ?? new Error("Vendors were not created");

  const vendorId = (name: string) => {
    const row = vendorRows.find((vendor) => vendor.name === name);
    if (!row) throw new Error(`Missing vendor ${name}`);
    return row.id as string;
  };
  const manjunatha = vendorId("Sri Manjunatha Water Supply");
  const kaveri = vendorId("Kaveri Tankers");
  const east = vendorId("East City Water Carts");
  const pending = vendorId("South Side Water Supply");

  const { error: priceError } = await supabase.from("vendor_prices").insert([
    { vendor_id: manjunatha, capacity_kl: 6, price_inr: 1600 },
    { vendor_id: manjunatha, capacity_kl: 10, price_inr: 2400 },
    { vendor_id: kaveri, capacity_kl: 10, price_inr: 2200 },
    { vendor_id: kaveri, capacity_kl: 12, price_inr: 2700 },
    { vendor_id: east, capacity_kl: 5, price_inr: 1100 },
    { vendor_id: east, capacity_kl: 6, price_inr: 1350 },
    { vendor_id: pending, capacity_kl: 6, price_inr: 1500 },
  ]);
  if (priceError) throw priceError;

  const { error: vendorProfileError } = await supabase
    .from("profiles")
    .update({ vendor_id: manjunatha })
    .eq("id", vendorUserId);
  if (vendorProfileError) throw vendorProfileError;

  const { data: society, error: societyError } = await supabase
    .from("societies")
    .insert({
      name: SOCIETY,
      address: "27, 14th Main, Sector 7, HSR Layout",
      city: "Bengaluru",
      pincode: "560102",
      unit_count: 86,
      tank_capacity_kl: 80,
    })
    .select("id")
    .single();
  if (societyError || !society) throw societyError ?? new Error("Society was not created");

  const { error: adminProfileError } = await supabase
    .from("profiles")
    .update({ society_id: society.id })
    .eq("id", adminId);
  if (adminProfileError) throw adminProfileError;

  const { error: residentProfileError } = await supabase
    .from("profiles")
    .update({ society_id: society.id, flat_number: "A-204" })
    .eq("id", residentId);
  if (residentProfileError) throw residentProfileError;

  const { error: adminLinkError } = await supabase
    .from("societies")
    .update({ admin_id: adminId })
    .eq("id", society.id);
  if (adminLinkError) throw adminLinkError;

  const deliveredAt = at(-5, "Morning");
  const { data: delivered, error: bookingError } = await supabase
    .from("bookings")
    .insert([
      {
        society_id: society.id,
        vendor_id: kaveri,
        requested_by: adminId,
        capacity_kl: 10,
        price_inr: 2200,
        status: "requested",
        scheduled_at: at(1, "Morning"),
        slot_label: "Morning",
        otp: "111111",
        notes: "Call the security gate on arrival.",
      },
      {
        society_id: society.id,
        vendor_id: east,
        requested_by: adminId,
        capacity_kl: 6,
        price_inr: 1350,
        status: "confirmed",
        scheduled_at: at(2, "Afternoon"),
        slot_label: "Afternoon",
        otp: "222222",
      },
      {
        society_id: society.id,
        vendor_id: manjunatha,
        requested_by: adminId,
        capacity_kl: 10,
        price_inr: 2400,
        status: "in_transit",
        scheduled_at: at(0, "Evening"),
        slot_label: "Evening",
        otp: "333333",
        notes: "Sump is behind B block.",
      },
      {
        society_id: society.id,
        vendor_id: manjunatha,
        requested_by: adminId,
        capacity_kl: 6,
        price_inr: 1600,
        status: "delivered",
        scheduled_at: deliveredAt,
        slot_label: "Morning",
        delivered_at: deliveredAt,
        otp: "444444",
      },
      {
        society_id: society.id,
        vendor_id: kaveri,
        requested_by: adminId,
        capacity_kl: 12,
        price_inr: 2700,
        status: "cancelled",
        scheduled_at: at(-1, "Evening"),
        slot_label: "Evening",
        otp: "555555",
        notes: "Cancelled after a municipal supply arrived.",
      },
    ])
    .select("id, otp");
  if (bookingError || !delivered) throw bookingError ?? new Error("Bookings were not created");
  const deliveredId = delivered.find((row) => row.otp === "444444")?.id;
  if (!deliveredId) throw new Error("Delivered booking missing");

  const harvest = annualHarvestLitres(12000, "sqft", "Bengaluru");
  const { error: restError } = await supabase.from("quality_logs").insert([
    {
      society_id: society.id,
      booking_id: deliveredId,
      source: "tanker",
      tested_at: istDay(-5),
      tds: 320,
      ph: 7.2,
      notes: "Clear sample from the Manjunatha delivery.",
      logged_by: adminId,
    },
    {
      society_id: society.id,
      source: "borewell",
      tested_at: istDay(-12),
      tds: 540,
      ph: 7.0,
      notes: "Borewell sample from the utility room.",
      logged_by: adminId,
    },
  ]);
  if (restError) throw restError;

  const { error: complaintError } = await supabase.from("complaints").insert({
    society_id: society.id,
    booking_id: deliveredId,
    created_by: residentId,
    message: "The water from the last tanker tasted salty in A block.",
    tds: 480,
    rating: 2,
    status: "open",
  });
  if (complaintError) throw complaintError;

  const { error: announcementError } = await supabase.from("announcements").insert({
    society_id: society.id,
    title: "Tanker this evening",
    message: "A 10 KL tanker is expected this evening. Please keep the sump gate clear.",
    created_by: adminId,
  });
  if (announcementError) throw announcementError;

  const { error: tankError } = await supabase.from("tank_levels").insert({
    society_id: society.id,
    level_percent: 42,
    notes: "Checked at the sump marker.",
    recorded_by: adminId,
  });
  if (tankError) throw tankError;

  const { error: rwhError } = await supabase.from("rwh_calculations").insert({
    society_id: society.id,
    roof_area: 12000,
    area_unit: "sqft",
    city_name: "Bengaluru",
    rainfall_mm: 970,
    runoff_coefficient: 0.8,
    estimated_harvest_liters: harvest,
    created_by: adminId,
  });
  if (rwhError) throw rwhError;

  const { error: inviteError } = await supabase.from("invites").insert({
    society_id: society.id,
    phone: "+919800000099",
    full_name: "Priya Nair",
    flat_number: "B-12",
    code: "JOIN86",
    created_by: adminId,
  });
  if (inviteError) throw inviteError;

  console.log("Seeded Lakeview Residency Association.");
  console.log(`Password for every demo account: ${PASSWORD}`);
  console.log("admin@lakeview.aquaos.demo");
  console.log("resident@lakeview.aquaos.demo");
  console.log("vendor@manjunatha.aquaos.demo");
  console.log("super@aquaos.demo");
  console.log("In-transit job OTP: 333333");
  console.log("Open invite JOIN86 for +91 98000 00099");
}

main().catch((error: unknown) => {
  console.error(error);
  process.exit(1);
});

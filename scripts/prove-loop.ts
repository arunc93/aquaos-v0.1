import { readFileSync } from "node:fs";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { slotToIso } from "../src/lib/format";

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
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
if (!url || !anonKey) {
  console.error("Set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY in .env.local");
  process.exit(1);
}

const PASSWORD = "AquaOS-pilot-2026";
const ADMIN = "admin@lakeview.aquaos.demo";
const VENDOR = "vendor@manjunatha.aquaos.demo";
const RESIDENT = "resident@lakeview.aquaos.demo";

const JPEG = Buffer.from(
  "/9j/4AAQSkZJRgABAQAAAQABAAD/2wCEAAkGBxISEhUSEhIVFRUXGB4YGBcYGBcYICggHBwcICggHBwcICggICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIP/AABEIAAEAAQMBIgACEQEDEQH/xAAbAAABBQEBAAAAAAAAAAAAAAADAAIEBQYHCP/EABUBAQEAAAAAAAAAAAAAAAAAAAAB/8QAFQEBAQAAAAAAAAAAAAAAAAAAAAX/xAAUEQEAAAAAAAAAAAAAAAAAAAAA/9oADAMBAAIRAxEAPwCfAAGQAf/Z",
  "base64",
);

function fail(message: string): never {
  console.error(`FAIL ${message}`);
  process.exit(1);
}

function pass(message: string) {
  console.log(`PASS ${message}`);
}

async function signIn(email: string): Promise<SupabaseClient> {
  const client = createClient(url!, anonKey!, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const signed = await client.auth.signInWithPassword({ email, password: PASSWORD });
  if (signed.error || !signed.data.user) {
    fail(`sign-in for ${email}: ${signed.error?.message ?? "no user"}`);
  }
  return client;
}

function futureMorning(): string {
  const today = new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Kolkata" }).format(new Date());
  const [year, month, day] = today.split("-").map(Number);
  const date = new Date(Date.UTC(year, month - 1, day + 7));
  const iso = slotToIso(date.toISOString().slice(0, 10), "Morning");
  if (!iso) fail("could not build a delivery slot");
  return iso;
}

async function main() {
  const admin = await signIn(ADMIN);
  const profile = await admin.from("profiles").select("id, society_id").eq("id", (await admin.auth.getUser()).data.user?.id ?? "").single();
  if (profile.error || !profile.data?.society_id) {
    fail(`admin profile: ${profile.error?.message ?? "no society"}`);
  }
  const societyId = profile.data.society_id;
  const adminId = profile.data.id;

  const vendor = await admin.from("vendors").select("id").eq("name", "Sri Manjunatha Water Supply").single();
  if (vendor.error || !vendor.data) {
    fail(`vendor lookup: ${vendor.error?.message ?? "missing"}`);
  }

  const created = await admin.rpc("create_booking", {
    p_vendor_id: vendor.data.id,
    p_capacity_kl: 6,
    p_scheduled_at: futureMorning(),
    p_slot_label: "Morning",
    p_notes: "Prove loop",
  });
  if (created.error || typeof created.data !== "string") {
    fail(`create booking: ${created.error?.message ?? "no id"}`);
  }
  const bookingId = created.data;
  pass(`booking ${bookingId} created`);

  const job = await admin.from("bookings").select("otp, status").eq("id", bookingId).single();
  if (job.error || !job.data?.otp) {
    fail(`read booking: ${job.error?.message ?? "no otp"}`);
  }
  const otp = job.data.otp;

  const vendorClient = await signIn(VENDOR);
  const confirmed = await vendorClient.rpc("transition_booking", {
    p_booking_id: bookingId,
    p_next_status: "confirmed",
    p_otp: "",
    p_proof_path: "",
  });
  if (confirmed.error) fail(`confirm: ${confirmed.error.message}`);
  pass("confirmed");

  const transit = await vendorClient.rpc("transition_booking", {
    p_booking_id: bookingId,
    p_next_status: "in_transit",
    p_otp: "",
    p_proof_path: "",
  });
  if (transit.error) fail(`in transit: ${transit.error.message}`);
  pass("in_transit");

  const wrong = await vendorClient.rpc("transition_booking", {
    p_booking_id: bookingId,
    p_next_status: "delivered",
    p_otp: "000000",
    p_proof_path: `${societyId}/${bookingId}/proof.jpg`,
  });
  if (!wrong.error) fail("wrong OTP was accepted");
  const still = await vendorClient.from("bookings").select("status").eq("id", bookingId).single();
  if (still.error || still.data?.status !== "in_transit") {
    fail(`status after wrong OTP: ${still.error?.message ?? still.data?.status ?? "missing"}`);
  }
  pass("wrong OTP rejected");

  const path = `${societyId}/${bookingId}/proof.jpg`;
  const uploaded = await vendorClient.storage.from("delivery-proofs").upload(path, JPEG, {
    contentType: "image/jpeg",
    upsert: false,
  });
  if (uploaded.error) fail(`photo upload: ${uploaded.error.message}`);
  pass("photo uploaded");

  const delivered = await vendorClient.rpc("transition_booking", {
    p_booking_id: bookingId,
    p_next_status: "delivered",
    p_otp: otp,
    p_proof_path: path,
  });
  if (delivered.error) fail(`deliver: ${delivered.error.message}`);
  const done = await vendorClient.from("bookings").select("status, proof_path").eq("id", bookingId).single();
  if (done.error || done.data?.status !== "delivered" || done.data.proof_path !== path) {
    fail(`delivered row: ${done.error?.message ?? done.data?.status ?? "missing"}`);
  }
  pass("delivered (OTP matched)");

  const today = new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Kolkata" }).format(new Date());
  const quality = await admin.from("quality_logs").insert({
    society_id: societyId,
    booking_id: bookingId,
    source: "tanker",
    tested_at: today,
    tds: 310,
    ph: 7.1,
    notes: "Prove loop",
    logged_by: adminId,
  }).select("id").single();
  if (quality.error || !quality.data) {
    fail(`quality log: ${quality.error?.message ?? "no row"}`);
  }
  pass(`quality log ${quality.data.id}`);

  const resident = await signIn(RESIDENT);
  const deliveries = await resident.rpc("my_deliveries");
  if (deliveries.error || !Array.isArray(deliveries.data)) {
    fail(`resident deliveries: ${deliveries.error?.message ?? "not a list"}`);
  }
  const mine = deliveries.data.find((row: { id?: string }) => row.id === bookingId);
  if (!mine) fail("resident delivery list omitted the new booking");
  if ("otp" in mine) fail("resident delivery included an OTP");
  pass("resident delivery has no OTP");

  const hidden = await resident.from("bookings").select("id").eq("id", bookingId);
  if (hidden.error) fail(`resident bookings select: ${hidden.error.message}`);
  if ((hidden.data ?? []).length !== 0) fail("resident could read the bookings table");
  pass("resident bookings select is empty");
}

main().catch((error: unknown) => {
  const message = error instanceof Error ? error.message : "unknown error";
  fail(message);
});

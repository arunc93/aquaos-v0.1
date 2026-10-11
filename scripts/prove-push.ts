import { readFileSync } from "node:fs";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import postgres from "postgres";
import { slotToIso } from "../src/lib/format";

function loadEnvFile() {
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
}

loadEnvFile();

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const databaseUrl = process.env.DATABASE_URL;
if (!url || !anonKey || !databaseUrl) {
  console.error("Set the Supabase URL, anon key, and database URL in .env.local");
  process.exit(1);
}

const PASSWORD = "AquaOS-pilot-2026";
const TOKEN = "ExponentPushToken[aquaosproof0000000001]";
const EXPECTED = "Tanker update: In transit. Sri Manjunatha Water Supply, 6 KL, Morning.";

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
  const date = new Date(Date.UTC(year, month - 1, day + 9));
  const iso = slotToIso(date.toISOString().slice(0, 10), "Morning");
  if (!iso) fail("could not build a delivery slot");
  return iso;
}

async function queuedPayload(sql: postgres.Sql, token: string): Promise<string | null> {
  const queued = await sql<{ body: string | null }[]>`
    select convert_from(body, 'utf8') as body
    from net.http_request_queue
    where url = 'https://exp.host/--/api/v2/push/send'
  `;
  return queued.find((row) => row.body?.includes(token))?.body ?? null;
}

async function main() {
  const resident = await signIn("resident@lakeview.aquaos.demo");
  const me = await resident.auth.getUser();
  const userId = me.data.user?.id;
  if (!userId) fail("resident id missing");
  await resident.from("device_tokens").delete().eq("token", TOKEN);
  const saved = await resident.from("device_tokens").upsert(
    { user_id: userId, token: TOKEN, platform: "android" },
    { onConflict: "user_id,token" },
  );
  if (saved.error) fail(`save token: ${saved.error.message}`);
  const own = await resident.from("device_tokens").select("token").eq("token", TOKEN);
  if (own.error || (own.data ?? []).length !== 1) fail("resident could not read their token");
  pass("resident saved a push token");

  const admin = await signIn("admin@lakeview.aquaos.demo");
  const hidden = await admin.from("device_tokens").select("token").eq("token", TOKEN);
  if (hidden.error) fail(`admin token read: ${hidden.error.message}`);
  if ((hidden.data ?? []).length !== 0) fail("admin could read a resident push token");
  pass("another user cannot read the token");

  const leftovers = await admin
    .from("bookings")
    .select("id, status")
    .eq("notes", "Push proof")
    .in("status", ["requested", "confirmed", "in_transit"]);
  if (leftovers.error) fail(`cleanup lookup: ${leftovers.error.message}`);
  for (const row of leftovers.data ?? []) {
    const cleared = await admin.rpc("transition_booking", {
      p_booking_id: row.id,
      p_next_status: "cancelled",
      p_otp: "",
      p_proof_path: "",
    });
    if (cleared.error) fail(`cleanup cancel: ${cleared.error.message}`);
  }

  const vendorRow = await admin.from("vendors").select("id").eq("name", "Sri Manjunatha Water Supply").single();
  if (vendorRow.error || !vendorRow.data) fail("vendor missing");
  const created = await admin.rpc("create_booking", {
    p_vendor_id: vendorRow.data.id,
    p_capacity_kl: 6,
    p_scheduled_at: futureMorning(),
    p_slot_label: "Morning",
    p_notes: "Push proof",
  });
  if (created.error || typeof created.data !== "string") fail(`create booking: ${created.error?.message ?? "no id"}`);
  const bookingId = created.data;
  const job = await admin.from("bookings").select("otp").eq("id", bookingId).single();
  if (job.error || !job.data?.otp) fail("could not read the new booking");
  const otp = job.data.otp;

  const vendor = await signIn("vendor@manjunatha.aquaos.demo");
  const confirmed = await vendor.rpc("transition_booking", {
    p_booking_id: bookingId,
    p_next_status: "confirmed",
    p_otp: "",
    p_proof_path: "",
  });
  if (confirmed.error) fail(`confirm: ${confirmed.error.message}`);

  const sql = postgres(databaseUrl!, { ssl: "require", connect_timeout: 20, max: 1 });
  const watch = (async () => {
    for (let attempt = 0; attempt < 100; attempt += 1) {
      const body = await queuedPayload(sql, TOKEN);
      if (body) return body;
      await new Promise((resolve) => setTimeout(resolve, 20));
    }
    return null;
  })();
  try {
    const mark = await sql<{ started: string }[]>`select now() as started`;
    const started = mark[0]?.started;
    if (!started) fail("could not read the database clock");
    const transit = await vendor.rpc("transition_booking", {
      p_booking_id: bookingId,
      p_next_status: "in_transit",
      p_otp: "",
      p_proof_path: "",
    });
    if (transit.error) fail(`in transit: ${transit.error.message}`);
    const body = await watch;
    const response = body
      ? null
      : await sql<{ content: string | null }[]>`
          select content
          from net._http_response
          where created > ${started}::timestamptz
          order by created desc
          limit 5
        `;
    const echoed = response?.find((row) => row.content?.includes(TOKEN))?.content ?? null;
    const recorded = body ?? echoed;
    if (!recorded) fail("pg_net did not record a push request");
    if (recorded.includes(otp)) fail("push body included the OTP");
    const sentence = await sql<{ message: string }[]>`
      select format(
        'Tanker update: %s. %s, %s KL, %s.',
        case b.status when 'in_transit' then 'In transit' else 'Delivered' end,
        v.name,
        regexp_replace(b.capacity_kl::text, '\.0$', ''),
        b.slot_label
      ) as message
      from public.bookings b
      join public.vendors v on v.id = b.vendor_id
      where b.id = ${bookingId}::uuid
    `;
    if (sentence[0]?.message !== EXPECTED) fail("push sentence did not match the booking");
    if (body && !body.includes(EXPECTED)) fail("queued push body did not match the delivery sentence");
    pass(body ? "in-transit push was queued without the OTP" : "in-transit push was sent without the OTP");

    const cancelled = await admin.rpc("transition_booking", {
      p_booking_id: bookingId,
      p_next_status: "cancelled",
      p_otp: "",
      p_proof_path: "",
    });
    if (cancelled.error) fail(`cancel: ${cancelled.error.message}`);
    await new Promise((resolve) => setTimeout(resolve, 1500));
    const after = await sql<{ body: string | null }[]>`
      select convert_from(body, 'utf8') as body
      from net.http_request_queue
      where url = 'https://exp.host/--/api/v2/push/send'
    `;
    if (after.some((row) => row.body?.includes("Cancelled"))) fail("cancelling sent a push");
    pass("cancelling did not send a push");
  } finally {
    await sql.end({ timeout: 5 });
  }

  const removed = await resident.from("device_tokens").delete().eq("token", TOKEN);
  if (removed.error) fail(`remove token: ${removed.error.message}`);
  pass("proof token removed");
}

main().catch((error: unknown) => {
  fail(error instanceof Error ? error.message : "unknown error");
});

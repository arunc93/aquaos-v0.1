import Link from "next/link";
import { BadgeLabel, StatusBadge } from "@/components/status-badge";
import { formatWhen } from "@/lib/format";
import { requireRole } from "@/lib/guard";
import { loadBookings } from "@/lib/load";
import { createClient } from "@/lib/supabase/server";

const GROUPS = ["requested", "confirmed", "in_transit", "delivered", "cancelled"] as const;

export default async function VendorJobsPage() {
  const profile = await requireRole("vendor");
  const bookings = await loadBookings("vendor_id", profile.vendor_id as string);
  const supabase = await createClient();
  const { data: vendor } = await supabase
    .from("vendors")
    .select("rating, reliability_score, quality_badge, verification_status")
    .eq("id", profile.vendor_id as string)
    .maybeSingle();

  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-2xl font-semibold">Jobs</h1>
      {vendor ? (
        <div className="flex flex-wrap gap-2">
          <BadgeLabel tone="info">{Number(vendor.rating).toFixed(1)} rating</BadgeLabel>
          <BadgeLabel tone="neutral">{vendor.reliability_score}% reliable</BadgeLabel>
          <BadgeLabel tone={vendor.quality_badge === "none" ? "neutral" : "success"}>
            {vendor.quality_badge === "none" ? "No quality badge" : `${vendor.quality_badge} badge`}
          </BadgeLabel>
          <BadgeLabel tone={vendor.verification_status === "verified" ? "success" : "warning"}>
            {vendor.verification_status}
          </BadgeLabel>
        </div>
      ) : null}
      {bookings.length === 0 ? <p>No jobs assigned yet.</p> : null}
      {GROUPS.map((status) => {
        const rows = bookings.filter((booking) => booking.status === status);
        if (rows.length === 0) return null;
        return (
          <section key={status} className="flex flex-col gap-2">
            <h2 className="text-lg font-semibold capitalize">{status.replace("_", " ")}</h2>
            {rows.map((booking) => (
              <Link key={booking.id} href={`/vendor/${booking.id}`} className="rounded-lg border border-border bg-card p-4">
                <div className="flex items-center justify-between gap-3">
                  <p className="font-semibold">{booking.capacity_kl} KL · {booking.slot_label}</p>
                  <StatusBadge status={booking.status} />
                </div>
                <p className="text-sm text-muted-foreground">{formatWhen(booking.scheduled_at)}</p>
              </Link>
            ))}
          </section>
        );
      })}
    </div>
  );
}

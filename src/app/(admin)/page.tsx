import Link from "next/link";
import { StatusBadge } from "@/components/status-badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatWhen, istMonthStartIso } from "@/lib/format";
import { embedded } from "@/lib/rows";
import { requireRole } from "@/lib/guard";
import { formatInr } from "@/lib/money";
import { createClient } from "@/lib/supabase/server";

export default async function DashboardPage() {
  const profile = await requireRole("society_admin");
  const societyId = profile.society_id as string;
  const supabase = await createClient();
  const monthStart = istMonthStartIso();

  const [tank, nextBooking, spendRows, complaints] = await Promise.all([
    supabase
      .from("tank_levels")
      .select("level_percent, recorded_at")
      .eq("society_id", societyId)
      .order("recorded_at", { ascending: false })
      .limit(1)
      .maybeSingle(),
    supabase
      .from("bookings")
      .select("id, status, scheduled_at, slot_label, capacity_kl, vendors(name)")
      .eq("society_id", societyId)
      .in("status", ["requested", "confirmed", "in_transit"])
      .order("scheduled_at", { ascending: true })
      .limit(1)
      .maybeSingle(),
    supabase
      .from("bookings")
      .select("price_inr")
      .eq("society_id", societyId)
      .eq("status", "delivered")
      .gte("delivered_at", monthStart),
    supabase
      .from("complaints")
      .select("id", { count: "exact", head: true })
      .eq("society_id", societyId)
      .eq("status", "open"),
  ]);

  if (tank.error || nextBooking.error || spendRows.error || complaints.error) {
    throw new Error(tank.error?.message ?? nextBooking.error?.message ?? spendRows.error?.message ?? complaints.error?.message);
  }

  const spend = (spendRows.data ?? []).reduce((sum, row) => sum + Number(row.price_inr), 0);
  const vendorName = embedded(
    nextBooking.data?.vendors as { name?: string } | { name?: string }[] | null,
  )?.name;

  return (
    <div className="flex flex-col gap-4">
      <h1 className="text-2xl font-semibold">Dashboard</h1>
      <div className="grid gap-4 sm:grid-cols-2">
        <Card>
          <CardHeader><CardTitle>Tank level</CardTitle></CardHeader>
          <CardContent>
            {tank.data ? (
              <>
                <p className="text-3xl font-semibold">{Number(tank.data.level_percent)}%</p>
                <p className="text-sm text-muted-foreground">Recorded {formatWhen(tank.data.recorded_at)}</p>
              </>
            ) : (
              <p>
                No reading yet. <Link className="font-semibold text-primary" href="/settings">Record today’s tank level</Link>
              </p>
            )}
          </CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle>Next booking</CardTitle></CardHeader>
          <CardContent>
            {nextBooking.data ? (
              <div className="flex flex-col gap-2">
                <StatusBadge status={nextBooking.data.status} />
                <p className="font-semibold">{vendorName ?? "Vendor"} · {Number(nextBooking.data.capacity_kl)} KL</p>
                <p className="text-sm text-muted-foreground">
                  {nextBooking.data.slot_label} · {formatWhen(nextBooking.data.scheduled_at)}
                </p>
                <Link className="font-semibold text-primary" href={`/bookings/${nextBooking.data.id}`}>Open booking</Link>
              </div>
            ) : (
              <p>
                No deliveries yet. <Link className="font-semibold text-primary" href="/book">Book a tanker</Link>
              </p>
            )}
          </CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle>This month’s spend</CardTitle></CardHeader>
          <CardContent>
            <p className="text-3xl font-semibold">{formatInr(spend)}</p>
            <p className="text-sm text-muted-foreground">Delivered tankers since the 1st, IST.</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle>Open complaints</CardTitle></CardHeader>
          <CardContent>
            <p className="text-3xl font-semibold">{complaints.count ?? 0}</p>
            <Link className="font-semibold text-primary" href="/quality">Review quality and complaints</Link>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

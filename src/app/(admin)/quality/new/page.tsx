import Link from "next/link";
import { QualityForm } from "@/components/quality-form";
import { formatWhen } from "@/lib/format";
import { requireRole } from "@/lib/guard";
import { loadBookings } from "@/lib/load";

export default async function NewQualityPage() {
  const profile = await requireRole("society_admin");
  const bookings = await loadBookings("society_id", profile.society_id as string);
  return (
    <div className="flex flex-col gap-4">
      <Link href="/quality" className="text-sm font-semibold text-primary">Back to logs</Link>
      <h1 className="text-2xl font-semibold">Add a quality log</h1>
      <QualityForm
        societyId={profile.society_id as string}
        bookings={bookings.map((booking) => ({
          id: booking.id,
          label: `${booking.vendor_name} · ${booking.slot_label} · ${formatWhen(booking.scheduled_at)}`,
        }))}
      />
    </div>
  );
}

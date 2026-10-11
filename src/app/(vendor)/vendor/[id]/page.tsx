import Link from "next/link";
import { notFound } from "next/navigation";
import { DeliverForm } from "@/components/deliver-form";
import { SubmitButton } from "@/components/form-bits";
import { StatusBadge } from "@/components/status-badge";
import { confirmBooking, markInTransit } from "@/lib/actions";
import { formatWhen } from "@/lib/format";
import { requireRole } from "@/lib/guard";
import { loadBooking, loadSociety, proofUrl } from "@/lib/load";
import { formatInr } from "@/lib/money";

export default async function VendorJobPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ error?: string }>;
}) {
  const profile = await requireRole("vendor");
  const { id } = await params;
  const query = await searchParams;
  const booking = await loadBooking(id);
  if (!booking || booking.vendor_id !== profile.vendor_id) notFound();
  const society = await loadSociety(booking.society_id);
  const photo = await proofUrl(booking.proof_path);

  return (
    <div className="flex max-w-xl flex-col gap-4">
      <Link href="/vendor" className="text-sm font-semibold text-primary">All jobs</Link>
      <div className="flex items-center gap-3">
        <h1 className="text-2xl font-semibold">{society.name}</h1>
        <StatusBadge status={booking.status} />
      </div>
      <p>{society.address}, {society.city} {society.pincode}</p>
      <p>{booking.capacity_kl} KL · {formatInr(booking.price_inr)}</p>
      <p>{booking.slot_label} · {formatWhen(booking.scheduled_at)}</p>
      {booking.notes ? <p>Notes: {booking.notes}</p> : null}
      {query.error ? <p role="alert" className="text-sm font-medium text-destructive">{query.error}</p> : null}
      {booking.status === "requested" ? (
        <form action={confirmBooking}>
          <input type="hidden" name="booking_id" value={booking.id} />
          <input type="hidden" name="return_to" value={`/vendor/${booking.id}`} />
          <SubmitButton pendingLabel="Confirming…">Confirm job</SubmitButton>
        </form>
      ) : null}
      {booking.status === "confirmed" ? (
        <form action={markInTransit}>
          <input type="hidden" name="booking_id" value={booking.id} />
          <input type="hidden" name="return_to" value={`/vendor/${booking.id}`} />
          <SubmitButton pendingLabel="Updating…">Out for delivery</SubmitButton>
        </form>
      ) : null}
      {booking.status === "in_transit" ? (
        <DeliverForm bookingId={booking.id} societyId={booking.society_id} />
      ) : null}
      {photo ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={photo} alt="Delivery proof" className="max-h-80 rounded-md object-cover" />
      ) : null}
    </div>
  );
}

import Link from "next/link";
import { notFound } from "next/navigation";
import { SubmitButton } from "@/components/form-bits";
import { StatusBadge } from "@/components/status-badge";
import { formatWhen } from "@/lib/format";
import { requireRole } from "@/lib/guard";
import { WhatsAppShare } from "@/components/whatsapp-share";
import { loadBooking, loadSociety, proofUrl } from "@/lib/load";
import { formatInr } from "@/lib/money";
import { cancelBooking, confirmBooking } from "@/lib/actions";
import { formatPhone } from "@/lib/phone";
import { deliveryMessage, whatsappShareUrl } from "@/lib/whatsapp";

export default async function BookingDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ error?: string }>;
}) {
  const profile = await requireRole("society_admin");
  const { id } = await params;
  const query = await searchParams;
  const booking = await loadBooking(id);
  if (!booking || booking.society_id !== profile.society_id) notFound();
  const society = await loadSociety(profile.society_id as string);
  const photo = await proofUrl(booking.proof_path);
  const shareHref = whatsappShareUrl(
    deliveryMessage({
      societyName: society.name,
      status: booking.status,
      vendorName: booking.vendor_name,
      capacityKl: booking.capacity_kl,
      slotLabel: booking.slot_label,
      scheduledAt: booking.scheduled_at,
      driverPhone: booking.vendor_phone,
    }),
  );

  return (
    <div className="flex max-w-xl flex-col gap-4">
      <Link href="/bookings" className="text-sm font-semibold text-primary">All bookings</Link>
      <div className="flex items-center gap-3">
        <h1 className="text-2xl font-semibold">{booking.vendor_name}</h1>
        <StatusBadge status={booking.status} />
      </div>
      <p>{booking.capacity_kl} KL · {formatInr(booking.price_inr)}</p>
      <p>{booking.slot_label} · {formatWhen(booking.scheduled_at)}</p>
      <p>Driver phone {formatPhone(booking.vendor_phone)}</p>
      {booking.notes ? <p>Notes: {booking.notes}</p> : null}
      {booking.status !== "cancelled" && booking.status !== "delivered" ? (
        <div className="rounded-lg border border-border bg-card p-4">
          <p className="text-sm font-semibold">Give this code to the driver on arrival</p>
          <p className="mt-1 font-mono text-3xl tracking-widest">{booking.otp}</p>
        </div>
      ) : null}
      {booking.delivered_at ? <p>Delivered {formatWhen(booking.delivered_at)}</p> : null}
      {photo ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={photo} alt="Delivery proof" className="max-h-80 rounded-md object-cover" />
      ) : null}
      {query.error ? <p role="alert" className="text-sm font-medium text-destructive">{query.error}</p> : null}
      <div className="flex flex-wrap gap-2">
        <WhatsAppShare href={shareHref} />
        {booking.status === "requested" ? (
          <form action={confirmBooking}>
            <input type="hidden" name="booking_id" value={booking.id} />
            <input type="hidden" name="return_to" value={`/bookings/${booking.id}`} />
            <SubmitButton pendingLabel="Confirming…">Confirm</SubmitButton>
          </form>
        ) : null}
        {booking.status !== "delivered" && booking.status !== "cancelled" ? (
          <form action={cancelBooking}>
            <input type="hidden" name="booking_id" value={booking.id} />
            <input type="hidden" name="return_to" value={`/bookings/${booking.id}`} />
            <SubmitButton variant="outline" pendingLabel="Cancelling…">Cancel booking</SubmitButton>
          </form>
        ) : null}
      </div>
    </div>
  );
}

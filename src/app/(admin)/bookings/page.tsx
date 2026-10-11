import Link from "next/link";
import { StatusBadge } from "@/components/status-badge";
import { Table, TableCell, TableHead } from "@/components/ui/table";
import { formatWhen } from "@/lib/format";
import { requireRole } from "@/lib/guard";
import { loadBookings } from "@/lib/load";
import { formatInr } from "@/lib/money";

export default async function BookingsPage() {
  const profile = await requireRole("society_admin");
  const bookings = await loadBookings("society_id", profile.society_id as string);

  return (
    <div className="flex flex-col gap-4">
      <h1 className="text-2xl font-semibold">Bookings</h1>
      {bookings.length === 0 ? (
        <p>No deliveries yet. <Link className="font-semibold text-primary" href="/book">Book a tanker</Link></p>
      ) : (
        <Table>
          <thead>
            <tr>
              <TableHead>When</TableHead>
              <TableHead>Vendor</TableHead>
              <TableHead>Size</TableHead>
              <TableHead>Price</TableHead>
              <TableHead>Status</TableHead>
            </tr>
          </thead>
          <tbody>
            {bookings.map((booking) => (
              <tr key={booking.id}>
                <TableCell>
                  <Link className="font-semibold text-primary" href={`/bookings/${booking.id}`}>
                    {booking.slot_label} · {formatWhen(booking.scheduled_at)}
                  </Link>
                </TableCell>
                <TableCell>{booking.vendor_name}</TableCell>
                <TableCell>{booking.capacity_kl} KL</TableCell>
                <TableCell>{formatInr(booking.price_inr)}</TableCell>
                <TableCell><StatusBadge status={booking.status} /></TableCell>
              </tr>
            ))}
          </tbody>
        </Table>
      )}
    </div>
  );
}

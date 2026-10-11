import type { ReactNode } from "react";
import { BookingLive } from "@/components/booking-live";
import { Shell } from "@/components/shell";
import { requireRole } from "@/lib/guard";
import { loadSociety } from "@/lib/load";

const LINKS = [
  { href: "/", label: "Dashboard" },
  { href: "/book", label: "Book tanker" },
  { href: "/bookings", label: "Bookings" },
  { href: "/quality", label: "Quality" },
  { href: "/rwh", label: "Rainwater" },
  { href: "/residents", label: "Residents" },
  { href: "/settings", label: "Settings" },
  { href: "/billing", label: "Billing" },
];

export default async function AdminLayout({ children }: { children: ReactNode }) {
  const profile = await requireRole("society_admin");
  const society = await loadSociety(profile.society_id as string);
  return (
    <>
      <Shell eyebrow={society.name} links={LINKS}>
        {children}
      </Shell>
      <BookingLive societyId={society.id} />
    </>
  );
}

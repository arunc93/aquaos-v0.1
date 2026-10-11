import type { ReactNode } from "react";
import { BookingLive } from "@/components/booking-live";
import { Shell } from "@/components/shell";
import { requireRole } from "@/lib/guard";
import { createClient } from "@/lib/supabase/server";

export default async function VendorLayout({ children }: { children: ReactNode }) {
  const profile = await requireRole("vendor");
  const supabase = await createClient();
  const { data } = await supabase.from("vendors").select("name").eq("id", profile.vendor_id as string).maybeSingle();
  return (
    <>
      <Shell eyebrow={data?.name ?? "Vendor"} links={[{ href: "/vendor", label: "Jobs" }]}>
        {children}
      </Shell>
      {profile.vendor_id ? <BookingLive vendorId={profile.vendor_id} /> : null}
    </>
  );
}

"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { createClient } from "@/lib/supabase/client";

export function BookingLive({
  societyId,
  vendorId,
}: {
  societyId?: string;
  vendorId?: string;
}) {
  const router = useRouter();
  useEffect(() => {
    const filter = societyId
      ? `society_id=eq.${societyId}`
      : vendorId
        ? `vendor_id=eq.${vendorId}`
        : null;
    if (!filter) return;
    const supabase = createClient();
    const channel = supabase
      .channel(`bookings-${societyId ?? vendorId}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "bookings", filter },
        () => router.refresh(),
      )
      .subscribe();
    return () => {
      void supabase.removeChannel(channel);
    };
  }, [router, societyId, vendorId]);
  return null;
}

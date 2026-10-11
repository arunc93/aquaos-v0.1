import { Shell } from "@/components/shell";
import { BadgeLabel } from "@/components/status-badge";
import { setVendorVerification } from "@/lib/actions";
import { SubmitButton } from "@/components/form-bits";
import { requireRole } from "@/lib/guard";
import { vendorSchema, parseRows } from "@/lib/schemas";
import { createClient } from "@/lib/supabase/server";

export default async function PlatformPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  await requireRole("super_admin");
  const query = await searchParams;
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("vendors")
    .select(
      "id, name, phone, vehicle_number, base_city, rating, reliability_score, verification_status, quality_badge, typical_eta_hours, last_delivery_photo_path, vendor_prices(capacity_kl, price_inr)",
    )
    .order("name");
  if (error) throw new Error(error.message);
  const vendors = parseRows(vendorSchema, data ?? []);

  return (
    <Shell eyebrow="Platform" links={[{ href: "/platform", label: "Vendors" }]}>
      <div className="flex flex-col gap-4">
        <h1 className="text-2xl font-semibold">Vendor verification</h1>
        {query.error ? <p role="alert" className="text-sm font-medium text-destructive">{query.error}</p> : null}
        {vendors.map((vendor) => (
          <article key={vendor.id} className="rounded-lg border border-border bg-card p-4">
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="text-lg font-semibold">{vendor.name}</h2>
              <BadgeLabel tone={vendor.verification_status === "verified" ? "success" : vendor.verification_status === "rejected" ? "danger" : "warning"}>
                {vendor.verification_status}
              </BadgeLabel>
            </div>
            <p className="text-sm text-muted-foreground">{vendor.base_city} · {vendor.vehicle_number}</p>
            <div className="mt-3 flex flex-wrap gap-2">
              {vendor.verification_status !== "verified" ? (
                <form action={setVendorVerification}>
                  <input type="hidden" name="vendor_id" value={vendor.id} />
                  <input type="hidden" name="status" value="verified" />
                  <SubmitButton pendingLabel="Saving…">Verify</SubmitButton>
                </form>
              ) : null}
              {vendor.verification_status !== "rejected" ? (
                <form action={setVendorVerification}>
                  <input type="hidden" name="vendor_id" value={vendor.id} />
                  <input type="hidden" name="status" value="rejected" />
                  <SubmitButton variant="outline" pendingLabel="Saving…">Reject</SubmitButton>
                </form>
              ) : null}
            </div>
          </article>
        ))}
      </div>
    </Shell>
  );
}

import Link from "next/link";
import { BadgeLabel } from "@/components/status-badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { proofUrl, loadVendors } from "@/lib/load";
import { formatInr } from "@/lib/money";
import { formatPhone } from "@/lib/phone";

const BADGE = {
  none: { label: "No quality badge", tone: "neutral" },
  verified: { label: "Quality verified", tone: "success" },
  premium: { label: "Premium quality", tone: "warning" },
} as const;

export default async function MarketplacePage() {
  const vendors = await loadVendors();
  const photos = await Promise.all(vendors.map((vendor) => proofUrl(vendor.last_delivery_photo_path)));

  return (
    <div className="flex flex-col gap-4">
      <h1 className="text-2xl font-semibold">Book a tanker</h1>
      <p className="text-muted-foreground">Verified operators. Prices are fixed for the capacity you choose.</p>
      {vendors.length === 0 ? (
        <p>No verified tankers yet. Ask the platform admin to verify a vendor.</p>
      ) : (
        <div className="grid gap-4 lg:grid-cols-2">
          {vendors.map((vendor, index) => {
            const badge = BADGE[vendor.quality_badge];
            return (
              <Card key={vendor.id}>
                <CardHeader>
                  <CardTitle>{vendor.name}</CardTitle>
                </CardHeader>
                <CardContent className="flex flex-col gap-3">
                  <div className="flex flex-wrap gap-2">
                    <BadgeLabel tone={badge.tone}>{badge.label}</BadgeLabel>
                    <BadgeLabel tone="info">{vendor.rating.toFixed(1)} rating</BadgeLabel>
                    <BadgeLabel tone="neutral">{vendor.reliability_score}% reliable</BadgeLabel>
                  </div>
                  <p className="text-sm">{formatPhone(vendor.phone)} · {vendor.base_city} · about {vendor.typical_eta_hours} hours</p>
                  <p className="text-sm text-muted-foreground">Vehicle {vendor.vehicle_number}</p>
                  <ul className="text-sm">
                    {vendor.vendor_prices
                      .slice()
                      .sort((a, b) => a.capacity_kl - b.capacity_kl)
                      .map((price) => (
                        <li key={price.capacity_kl}>{price.capacity_kl} KL — {formatInr(price.price_inr)}</li>
                      ))}
                  </ul>
                  {photos[index] ? (
                    // Signed URLs expire and are not a configured image host.
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={photos[index] as string} alt={`Last delivery by ${vendor.name}`} className="h-36 w-full rounded-md object-cover" />
                  ) : (
                    <p className="text-sm text-muted-foreground">No delivery photo yet.</p>
                  )}
                  <Link href={`/book/${vendor.id}`} className="inline-flex h-11 items-center justify-center rounded-md bg-primary px-4 font-semibold text-primary-foreground">
                    Book {vendor.name}
                  </Link>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}

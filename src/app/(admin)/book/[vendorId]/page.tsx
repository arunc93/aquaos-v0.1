import Link from "next/link";
import { notFound } from "next/navigation";
import { BookForm } from "@/components/book-form";
import { requireRole } from "@/lib/guard";
import { loadVendors } from "@/lib/load";

export default async function BookVendorPage({ params }: { params: Promise<{ vendorId: string }> }) {
  await requireRole("society_admin");
  const { vendorId } = await params;
  const vendors = await loadVendors();
  const vendor = vendors.find((item) => item.id === vendorId);
  if (!vendor) notFound();

  return (
    <div className="flex flex-col gap-4">
      <Link href="/book" className="text-sm font-semibold text-primary">Back to tankers</Link>
      <h1 className="text-2xl font-semibold">Book {vendor.name}</h1>
      <p className="text-muted-foreground">About {vendor.typical_eta_hours} hours after the slot starts. The request waits until you or the vendor confirms it.</p>
      <BookForm vendorId={vendor.id} prices={vendor.vendor_prices} />
    </div>
  );
}

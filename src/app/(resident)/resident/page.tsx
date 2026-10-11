import { ComplaintForm } from "@/components/simple-forms";
import { Shell } from "@/components/shell";
import { WhatsAppShare } from "@/components/whatsapp-share";
import { StatusBadge } from "@/components/status-badge";
import { formatWhen } from "@/lib/format";
import { requireRole } from "@/lib/guard";
import { loadSociety, proofUrl } from "@/lib/load";
import { deliverySchema, parseRows } from "@/lib/schemas";
import { createClient } from "@/lib/supabase/server";
import { announcementMessage, deliveryMessage, whatsappShareUrl } from "@/lib/whatsapp";

export default async function ResidentPage() {
  const profile = await requireRole("resident");
  const society = await loadSociety(profile.society_id as string);
  const supabase = await createClient();
  const [deliveries, announcements] = await Promise.all([
    supabase.rpc("my_deliveries"),
    supabase
      .from("announcements")
      .select("id, title, message, created_at")
      .eq("society_id", society.id)
      .order("created_at", { ascending: false }),
  ]);
  if (deliveries.error || announcements.error) {
    throw new Error(deliveries.error?.message ?? announcements.error?.message);
  }
  const rows = parseRows(deliverySchema, deliveries.data ?? []);
  const nextDelivery = [...rows]
    .filter((row) => row.status !== "cancelled" && row.status !== "delivered")
    .sort((a, b) => a.scheduled_at.localeCompare(b.scheduled_at))[0];
  const photos = await Promise.all(rows.map((row) => proofUrl(row.proof_path)));

  return (
    <Shell eyebrow={society.name} links={[{ href: "/resident", label: "Home" }]}>
      <div className="flex flex-col gap-8">
        <section className="flex flex-col gap-2">
          <h1 className="text-2xl font-semibold">Next delivery</h1>
          {nextDelivery ? (
            <div className="rounded-lg border border-border bg-card p-4">
              <div className="flex items-center gap-2">
                <p className="font-semibold">{nextDelivery.vendor_name}</p>
                <StatusBadge status={nextDelivery.status} />
              </div>
              <p>{nextDelivery.capacity_kl} KL · {nextDelivery.slot_label}</p>
              <p className="text-sm text-muted-foreground">{formatWhen(nextDelivery.scheduled_at)}</p>
              <div className="mt-3">
                <WhatsAppShare
                  href={whatsappShareUrl(
                    deliveryMessage({
                      societyName: society.name,
                      status: nextDelivery.status,
                      vendorName: nextDelivery.vendor_name,
                      capacityKl: nextDelivery.capacity_kl,
                      slotLabel: nextDelivery.slot_label,
                      scheduledAt: nextDelivery.scheduled_at,
                    }),
                  )}
                />
              </div>
            </div>
          ) : (
            <p>No tanker is booked right now.</p>
          )}
        </section>

        <section className="flex flex-col gap-3">
          <h2 className="text-xl font-semibold">Deliveries</h2>
          {rows.length === 0 ? <p className="text-muted-foreground">None yet.</p> : null}
          {rows.map((row, index) => (
            <article key={row.id} className="rounded-lg border border-border bg-card p-4">
              <div className="flex items-center gap-2">
                <p className="font-semibold">{row.vendor_name}</p>
                <StatusBadge status={row.status} />
              </div>
              <p className="text-sm">{row.slot_label} · {formatWhen(row.scheduled_at)} · {row.capacity_kl} KL</p>
              {photos[index] ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={photos[index] as string} alt="Delivery proof" className="mt-2 h-32 rounded-md object-cover" />
              ) : null}
            </article>
          ))}
        </section>

        <section className="flex flex-col gap-3">
          <h2 className="text-xl font-semibold">Announcements</h2>
          {(announcements.data ?? []).length === 0 ? <p className="text-muted-foreground">No announcements.</p> : null}
          {(announcements.data ?? []).map((item) => (
            <article key={item.id} className="rounded-lg border border-border bg-card p-4">
              <h3 className="font-semibold">{item.title}</h3>
              <p className="whitespace-pre-wrap">{item.message}</p>
              <p className="text-sm text-muted-foreground">{formatWhen(item.created_at)}</p>
              <div className="mt-3">
                <WhatsAppShare
                  href={whatsappShareUrl(
                    announcementMessage({
                      societyName: society.name,
                      title: item.title,
                      message: item.message,
                    }),
                  )}
                />
              </div>
            </article>
          ))}
        </section>

        <section className="flex flex-col gap-3">
          <h2 className="text-xl font-semibold">Report an issue</h2>
          <ComplaintForm
            deliveries={rows.map((row) => ({
              id: row.id,
              label: `${row.vendor_name} · ${formatWhen(row.scheduled_at)}`,
            }))}
          />
        </section>
      </div>
    </Shell>
  );
}

import { RwhForm } from "@/components/simple-forms";
import { formatWhen } from "@/lib/format";
import { requireRole } from "@/lib/guard";
import { createClient } from "@/lib/supabase/server";

export default async function RwhPage() {
  const profile = await requireRole("society_admin");
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("rwh_calculations")
    .select("id, roof_area, area_unit, city_name, rainfall_mm, runoff_coefficient, estimated_harvest_liters, created_at")
    .eq("society_id", profile.society_id as string)
    .order("created_at", { ascending: false });
  if (error) throw new Error(error.message);

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold">Rainwater harvest</h1>
        <p className="text-muted-foreground">
          Annual estimate for a concrete or tile roof. Runoff coefficient 0.80. This is a planning estimate.
        </p>
      </div>
      <RwhForm />
      <section className="flex flex-col gap-3">
        <h2 className="text-lg font-semibold">Saved calculations</h2>
        {(data ?? []).length === 0 ? <p className="text-muted-foreground">None saved yet.</p> : null}
        {(data ?? []).map((row) => (
          <div key={row.id} className="rounded-lg border border-border bg-card p-4">
            <p className="font-semibold">
              {Number(row.estimated_harvest_liters).toLocaleString("en-IN")} litres / year
            </p>
            <p className="text-sm text-muted-foreground">
              {Number(row.roof_area)} {row.area_unit} · {row.city_name} · {row.rainfall_mm} mm · coefficient {Number(row.runoff_coefficient)}
            </p>
            <p className="text-sm text-muted-foreground">{formatWhen(row.created_at)}</p>
          </div>
        ))}
      </section>
    </div>
  );
}

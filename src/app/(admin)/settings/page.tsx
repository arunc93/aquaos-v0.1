import { SocietyForm, TankForm } from "@/components/simple-forms";
import { formatWhen } from "@/lib/format";
import { requireRole } from "@/lib/guard";
import { loadSociety } from "@/lib/load";
import { createClient } from "@/lib/supabase/server";

export default async function SettingsPage() {
  const profile = await requireRole("society_admin");
  const society = await loadSociety(profile.society_id as string);
  const supabase = await createClient();
  const { data } = await supabase
    .from("tank_levels")
    .select("level_percent, recorded_at, notes")
    .eq("society_id", society.id)
    .order("recorded_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  return (
    <div className="flex flex-col gap-8">
      <h1 className="text-2xl font-semibold">Settings</h1>
      <section className="flex flex-col gap-3">
        <h2 className="text-lg font-semibold">Society</h2>
        <SocietyForm society={society} />
      </section>
      <section className="flex flex-col gap-3">
        <h2 className="text-lg font-semibold">Tank level</h2>
        {data ? (
          <p className="text-sm text-muted-foreground">
            Latest reading is {Number(data.level_percent)}% on {formatWhen(data.recorded_at)}.
            {data.notes ? ` ${data.notes}` : ""}
          </p>
        ) : (
          <p className="text-sm text-muted-foreground">Record today’s tank level so the dashboard has a figure.</p>
        )}
        <TankForm />
      </section>
    </div>
  );
}

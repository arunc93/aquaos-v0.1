import Link from "next/link";
import { SubmitButton } from "@/components/form-bits";
import { TdsChart } from "@/components/tds-chart";
import { BadgeLabel } from "@/components/status-badge";
import { Table, TableCell, TableHead } from "@/components/ui/table";
import { resolveComplaint } from "@/lib/actions";
import { formatDay, formatWhen } from "@/lib/format";
import { requireRole } from "@/lib/guard";
import { signedUrl } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";

export default async function QualityPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const profile = await requireRole("society_admin");
  const societyId = profile.society_id as string;
  const query = await searchParams;
  const supabase = await createClient();
  const [logs, complaints] = await Promise.all([
    supabase
      .from("quality_logs")
      .select("id, source, tested_at, tds, ph, notes, report_path, booking_id")
      .eq("society_id", societyId)
      .order("tested_at", { ascending: false }),
    supabase
      .from("complaints")
      .select("id, message, tds, rating, status, created_at")
      .eq("society_id", societyId)
      .order("created_at", { ascending: false }),
  ]);
  if (logs.error || complaints.error) {
    throw new Error(logs.error?.message ?? complaints.error?.message);
  }
  const reports = await Promise.all((logs.data ?? []).map((log) => signedUrl("quality-reports", log.report_path)));

  return (
    <div className="flex flex-col gap-8">
      <div className="flex items-center justify-between gap-3">
        <h1 className="text-2xl font-semibold">Quality logs</h1>
        <Link href="/quality/new" className="inline-flex h-11 items-center rounded-md bg-primary px-4 font-semibold text-primary-foreground">
          Add log
        </Link>
      </div>
      {query.error ? <p role="alert" className="text-sm font-medium text-destructive">{query.error}</p> : null}
      <TdsChart
        readings={(logs.data ?? []).map((log) => ({
          testedAt: log.tested_at,
          tds: Number(log.tds),
        }))}
      />
      {(logs.data ?? []).length === 0 ? (
        <p>No tests yet. <Link className="font-semibold text-primary" href="/quality/new">Log the first result</Link></p>
      ) : (
        <Table>
          <thead>
            <tr>
              <TableHead>Date</TableHead>
              <TableHead>Source</TableHead>
              <TableHead>TDS</TableHead>
              <TableHead>pH</TableHead>
              <TableHead>Notes</TableHead>
            </tr>
          </thead>
          <tbody>
            {(logs.data ?? []).map((log, index) => (
              <tr key={log.id}>
                <TableCell>{formatDay(log.tested_at)}</TableCell>
                <TableCell className="capitalize">{log.source}{log.booking_id ? " · delivery" : ""}</TableCell>
                <TableCell>{Number(log.tds)}</TableCell>
                <TableCell>{Number(log.ph)}</TableCell>
                <TableCell>
                  {log.notes}
                  {reports[index] ? (
                    <>
                      {" "}
                      <a className="font-semibold text-primary" href={reports[index] as string}>Report</a>
                    </>
                  ) : null}
                </TableCell>
              </tr>
            ))}
          </tbody>
        </Table>
      )}

      <section className="flex flex-col gap-3">
        <h2 className="text-xl font-semibold">Complaints</h2>
        {(complaints.data ?? []).length === 0 ? <p className="text-muted-foreground">No complaints.</p> : null}
        {(complaints.data ?? []).map((complaint) => (
          <div key={complaint.id} className="rounded-lg border border-border bg-card p-4">
            <div className="mb-2 flex items-center gap-2">
              <BadgeLabel tone={complaint.status === "open" ? "danger" : "success"}>
                {complaint.status === "open" ? "Open" : "Resolved"}
              </BadgeLabel>
              <span className="text-sm text-muted-foreground">{formatWhen(complaint.created_at)}</span>
            </div>
            <p>{complaint.message}</p>
            <p className="text-sm text-muted-foreground">
              {complaint.rating ? `Rating ${complaint.rating}/5. ` : ""}
              {complaint.tds !== null ? `TDS ${Number(complaint.tds)}.` : ""}
            </p>
            {complaint.status === "open" ? (
              <form action={resolveComplaint} className="mt-3">
                <input type="hidden" name="complaint_id" value={complaint.id} />
                <SubmitButton variant="outline" pendingLabel="Resolving…">Mark resolved</SubmitButton>
              </form>
            ) : null}
          </div>
        ))}
      </section>
    </div>
  );
}

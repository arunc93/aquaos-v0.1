"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Field } from "@/components/form-bits";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { createQualityLog } from "@/lib/actions";
import { createClient } from "@/lib/supabase/client";

const SOURCES = [
  { value: "tanker", label: "Tanker" },
  { value: "borewell", label: "Borewell" },
  { value: "municipal", label: "Municipal" },
  { value: "other", label: "Other" },
];

export function QualityForm({
  societyId,
  bookings,
}: {
  societyId: string;
  bookings: { id: string; label: string }[];
}) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    const form = new FormData(event.currentTarget);
    const file = form.get("report");
    let reportPath: string | null = null;
    setPending(true);
    if (file instanceof File && file.size > 0) {
      if (file.size > 5 * 1024 * 1024) {
        setError("The report photo must be under 5 MB.");
        setPending(false);
        return;
      }
      const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, "") || "report.jpg";
      reportPath = `${societyId}/${crypto.randomUUID()}-${safeName}`;
      const supabase = createClient();
      const uploaded = await supabase.storage.from("quality-reports").upload(reportPath, file, {
        contentType: file.type || "image/jpeg",
      });
      if (uploaded.error) {
        setError(uploaded.error.message);
        setPending(false);
        return;
      }
    }
    const result = await createQualityLog({
      testedAt: String(form.get("tested_at") ?? ""),
      source: String(form.get("source") ?? ""),
      bookingId: String(form.get("booking_id") ?? ""),
      tds: String(form.get("tds") ?? ""),
      ph: String(form.get("ph") ?? ""),
      notes: String(form.get("notes") ?? ""),
      reportPath,
    });
    if (result?.error) {
      setError(result.error);
      setPending(false);
      return;
    }
    router.push("/quality");
    router.refresh();
  }

  return (
    <form onSubmit={onSubmit} className="flex max-w-lg flex-col gap-4">
      <Field label="Test date">
        <Input name="tested_at" type="date" required />
      </Field>
      <Field label="Delivery" hint="Leave this blank to log a borewell, municipal, or other source.">
        <select name="booking_id" className="h-11 w-full rounded-md border border-border bg-card px-3 text-base" defaultValue="">
          <option value="">Not tied to a delivery</option>
          {bookings.map((booking) => (
            <option key={booking.id} value={booking.id}>
              {booking.label}
            </option>
          ))}
        </select>
      </Field>
      <Field label="Source, if this is not a delivery">
        <select name="source" className="h-11 w-full rounded-md border border-border bg-card px-3 text-base" defaultValue="tanker">
          {SOURCES.map((source) => (
            <option key={source.value} value={source.value}>
              {source.label}
            </option>
          ))}
        </select>
      </Field>
      <Field label="TDS (mg/L)">
        <Input name="tds" inputMode="decimal" required />
      </Field>
      <Field label="pH">
        <Input name="ph" inputMode="decimal" required />
      </Field>
      <Field label="Notes">
        <Textarea name="notes" />
      </Field>
      <Field label="Photo of the report" hint="Optional.">
        <Input name="report" type="file" accept="image/*" />
      </Field>
      {error ? (
        <p role="alert" className="text-sm font-medium text-destructive">
          {error}
        </p>
      ) : null}
      <Button type="submit" disabled={pending}>
        {pending ? "Saving…" : "Save log"}
      </Button>
    </form>
  );
}

"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Field } from "@/components/form-bits";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { markDelivered } from "@/lib/actions";
import { createClient } from "@/lib/supabase/client";

export function DeliverForm({ bookingId, societyId }: { bookingId: string; societyId: string }) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    const form = new FormData(event.currentTarget);
    const otp = String(form.get("otp") ?? "").trim();
    const file = form.get("photo");
    if (!(file instanceof File) || file.size === 0) {
      setError("Choose a delivery photo.");
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      setError("Photo must be under 5 MB.");
      return;
    }
    if (!/^\d{6}$/.test(otp)) {
      setError("Enter the 6-digit OTP from the society.");
      return;
    }
    setPending(true);
    const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, "") || "proof.jpg";
    const path = `${societyId}/${bookingId}/${crypto.randomUUID()}-${safeName}`;
    const supabase = createClient();
    const uploaded = await supabase.storage.from("delivery-proofs").upload(path, file, {
      contentType: file.type || "image/jpeg",
    });
    if (uploaded.error) {
      setError(uploaded.error.message);
      setPending(false);
      return;
    }
    const result = await markDelivered(bookingId, otp, path);
    if (result?.error) {
      setError(result.error);
      setPending(false);
      return;
    }
    router.push(`/vendor/${bookingId}`);
    router.refresh();
  }

  return (
    <form onSubmit={onSubmit} className="flex max-w-lg flex-col gap-4">
      <Field label="Delivery photo" hint="A photo of the tanker at the society gate or the filled sump.">
        <Input name="photo" type="file" accept="image/*" required />
      </Field>
      <Field label="OTP from the society admin">
        <Input name="otp" inputMode="numeric" autoComplete="one-time-code" maxLength={6} required />
      </Field>
      {error ? (
        <p role="alert" className="text-sm font-medium text-destructive">
          {error}
        </p>
      ) : null}
      <Button type="submit" disabled={pending}>
        {pending ? "Uploading…" : "Mark delivered"}
      </Button>
    </form>
  );
}

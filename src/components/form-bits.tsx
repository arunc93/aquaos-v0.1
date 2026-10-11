"use client";

import type { ReactNode } from "react";
import { useFormStatus } from "react-dom";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import type { ActionState } from "@/lib/actions";

export function Field({
  label,
  children,
  hint,
}: {
  label: string;
  children: ReactNode;
  hint?: string;
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <Label>{label}</Label>
      {children}
      {hint ? <p className="text-sm text-muted-foreground">{hint}</p> : null}
    </div>
  );
}

export function FormFeedback({ state }: { state: ActionState }) {
  if (state?.error) {
    return (
      <p role="alert" className="text-sm font-medium text-destructive">
        {state.error}
      </p>
    );
  }
  if (state?.notice) {
    return <p className="text-sm font-medium text-emerald-800">{state.notice}</p>;
  }
  return null;
}

export function SubmitButton({
  children,
  pendingLabel = "Saving…",
  variant = "default",
}: {
  children: ReactNode;
  pendingLabel?: string;
  variant?: "default" | "outline" | "ghost" | "destructive";
}) {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" disabled={pending} variant={variant}>
      {pending ? pendingLabel : children}
    </Button>
  );
}

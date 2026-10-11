"use client";

import { useActionState, useState } from "react";
import { Field, FormFeedback, SubmitButton } from "@/components/form-bits";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { createBooking, type ActionState } from "@/lib/actions";
import { formatInr } from "@/lib/money";

const SLOTS = ["Morning", "Afternoon", "Evening"];

export function BookForm({
  vendorId,
  prices,
}: {
  vendorId: string;
  prices: { capacity_kl: number; price_inr: number }[];
}) {
  const [state, action] = useActionState<ActionState, FormData>(createBooking, null);
  const [capacity, setCapacity] = useState(String(prices[0]?.capacity_kl ?? ""));
  const selected = prices.find((price) => String(price.capacity_kl) === capacity);

  return (
    <form action={action} className="flex max-w-lg flex-col gap-4">
      <input type="hidden" name="vendor_id" value={vendorId} />
      <Field label="Capacity">
        <select
          name="capacity_kl"
          value={capacity}
          onChange={(event) => setCapacity(event.target.value)}
          className="h-11 w-full rounded-md border border-border bg-card px-3 text-base"
        >
          {prices.map((price) => (
            <option key={price.capacity_kl} value={price.capacity_kl}>
              {price.capacity_kl} KL — {formatInr(price.price_inr)}
            </option>
          ))}
        </select>
      </Field>
      <Field label="Delivery day">
        <Input name="date" type="date" required />
      </Field>
      <Field label="Slot">
        <select name="slot_label" className="h-11 w-full rounded-md border border-border bg-card px-3 text-base" defaultValue="Morning">
          {SLOTS.map((slot) => (
            <option key={slot}>{slot}</option>
          ))}
        </select>
      </Field>
      <Field label="Notes for the driver" hint="Optional. Gate number, sump location, or who to call.">
        <Textarea name="notes" />
      </Field>
      <p className="text-lg font-semibold">{selected ? formatInr(selected.price_inr) : "Choose a capacity"}</p>
      <FormFeedback state={state} />
      <SubmitButton pendingLabel="Requesting…">Request tanker</SubmitButton>
    </form>
  );
}

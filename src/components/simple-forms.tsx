"use client";

import { useActionState } from "react";
import { Field, FormFeedback, SubmitButton } from "@/components/form-bits";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  createComplaint,
  createInvite,
  postAnnouncement,
  recordTankLevel,
  saveRwh,
  updateSociety,
  type ActionState,
} from "@/lib/actions";
import { CITIES } from "@/lib/rwh";
import type { Society } from "@/lib/schemas";

function useForm(action: (prev: ActionState, formData: FormData) => Promise<ActionState>) {
  return useActionState<ActionState, FormData>(action, null);
}

export function SocietyForm({ society }: { society: Society }) {
  const [state, action] = useForm(updateSociety);
  return (
    <form action={action} className="flex max-w-lg flex-col gap-4">
      <Field label="Society name"><Input name="name" defaultValue={society.name} required /></Field>
      <Field label="Address"><Input name="address" defaultValue={society.address} required /></Field>
      <Field label="City"><Input name="city" defaultValue={society.city} required /></Field>
      <Field label="Pincode"><Input name="pincode" defaultValue={society.pincode} required /></Field>
      <Field label="Units"><Input name="unit_count" defaultValue={society.unit_count} required /></Field>
      <Field label="Tank capacity (KL)"><Input name="tank_capacity_kl" defaultValue={society.tank_capacity_kl} required /></Field>
      <FormFeedback state={state} />
      <SubmitButton>Save society</SubmitButton>
    </form>
  );
}

export function TankForm() {
  const [state, action] = useForm(recordTankLevel);
  return (
    <form action={action} className="flex max-w-lg flex-col gap-4">
      <Field label="Tank level (%)" hint="A visual check is enough for this pilot. 0 is empty and 100 is full.">
        <Input name="level_percent" inputMode="decimal" min={0} max={100} required />
      </Field>
      <Field label="Notes"><Input name="notes" /></Field>
      <FormFeedback state={state} />
      <SubmitButton pendingLabel="Recording…">Record level</SubmitButton>
    </form>
  );
}

export function RwhForm() {
  const [state, action] = useForm(saveRwh);
  return (
    <form action={action} className="flex max-w-lg flex-col gap-4">
      <Field label="Roof area">
        <Input name="roof_area" inputMode="decimal" required />
      </Field>
      <Field label="Unit">
        <select name="area_unit" className="h-11 rounded-md border border-border bg-card px-3" defaultValue="sqft">
          <option value="sqft">Square feet</option>
          <option value="sqm">Square metres</option>
        </select>
      </Field>
      <Field label="City">
        <select name="city" className="h-11 rounded-md border border-border bg-card px-3" defaultValue="Bengaluru">
          {CITIES.map((city) => (
            <option key={city}>{city}</option>
          ))}
        </select>
      </Field>
      <FormFeedback state={state} />
      <SubmitButton>Calculate and save</SubmitButton>
    </form>
  );
}

export function InviteForm() {
  const [state, action] = useForm(createInvite);
  return (
    <form action={action} className="flex max-w-lg flex-col gap-4">
      <Field label="Resident name"><Input name="full_name" required /></Field>
      <Field label="Mobile number"><Input name="phone" inputMode="tel" required /></Field>
      <Field label="Flat"><Input name="flat_number" required /></Field>
      <FormFeedback state={state} />
      <SubmitButton pendingLabel="Creating…">Create invite</SubmitButton>
    </form>
  );
}

export function AnnouncementForm() {
  const [state, action] = useForm(postAnnouncement);
  return (
    <form action={action} className="flex max-w-lg flex-col gap-4">
      <Field label="Title"><Input name="title" required /></Field>
      <Field label="Message"><Textarea name="message" required /></Field>
      <FormFeedback state={state} />
      <SubmitButton>Post announcement</SubmitButton>
    </form>
  );
}

export function ComplaintForm({ deliveries }: { deliveries: { id: string; label: string }[] }) {
  const [state, action] = useForm(createComplaint);
  return (
    <form action={action} className="flex max-w-lg flex-col gap-4">
      <Field label="What is wrong?">
        <Textarea name="message" required />
      </Field>
      <Field label="Related delivery" hint="Optional.">
        <select name="booking_id" className="h-11 rounded-md border border-border bg-card px-3" defaultValue="">
          <option value="">Not about a specific delivery</option>
          {deliveries.map((delivery) => (
            <option key={delivery.id} value={delivery.id}>{delivery.label}</option>
          ))}
        </select>
      </Field>
      <Field label="TDS, if you measured it" hint="Optional.">
        <Input name="tds" inputMode="decimal" />
      </Field>
      <Field label="Rating" hint="Optional. 1 is poor and 5 is good.">
        <select name="rating" className="h-11 rounded-md border border-border bg-card px-3" defaultValue="">
          <option value="">No rating</option>
          {[1, 2, 3, 4, 5].map((score) => (
            <option key={score} value={score}>{score}</option>
          ))}
        </select>
      </Field>
      <FormFeedback state={state} />
      <SubmitButton pendingLabel="Sending…">Send feedback</SubmitButton>
    </form>
  );
}

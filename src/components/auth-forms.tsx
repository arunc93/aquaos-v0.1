"use client";

import Link from "next/link";
import { useActionState } from "react";
import { Field, FormFeedback, SubmitButton } from "@/components/form-bits";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { acceptInvite, createSociety, signIn, signUp, type ActionState } from "@/lib/actions";

export function LoginForm() {
  const [state, action] = useActionState<ActionState, FormData>(signIn, null);
  return (
    <Card>
      <CardHeader>
        <CardTitle>Sign in</CardTitle>
      </CardHeader>
      <CardContent>
        <form action={action} className="flex flex-col gap-4">
          <Field label="Email">
            <Input name="email" type="email" autoComplete="username" required />
          </Field>
          <Field label="Password">
            <Input name="password" type="password" autoComplete="current-password" required />
          </Field>
          <FormFeedback state={state} />
          <SubmitButton pendingLabel="Signing in…">Sign in</SubmitButton>
        </form>
        <p className="mt-4 text-sm">
          New society? <Link className="font-semibold text-primary" href="/signup">Create an account</Link>
        </p>
      </CardContent>
    </Card>
  );
}

export function SignupForm() {
  const [state, action] = useActionState<ActionState, FormData>(signUp, null);
  return (
    <Card>
      <CardHeader>
        <CardTitle>Create an account</CardTitle>
      </CardHeader>
      <CardContent>
        <form action={action} className="flex flex-col gap-4">
          <Field label="Name">
            <Input name="full_name" autoComplete="name" required />
          </Field>
          <Field label="Mobile number" hint="10-digit Indian mobile. This is how the society reaches you.">
            <Input name="phone" inputMode="tel" autoComplete="tel" required />
          </Field>
          <Field label="Email">
            <Input name="email" type="email" autoComplete="email" required />
          </Field>
          <Field label="Password" hint="At least 8 characters.">
            <Input name="password" type="password" autoComplete="new-password" required />
          </Field>
          <Field label="Invite code" hint="Leave blank if you are setting up a new society.">
            <Input name="invite_code" maxLength={6} />
          </Field>
          <FormFeedback state={state} />
          <SubmitButton pendingLabel="Creating account…">Create account</SubmitButton>
        </form>
        <p className="mt-4 text-sm">
          Already registered? <Link className="font-semibold text-primary" href="/login">Sign in</Link>
        </p>
      </CardContent>
    </Card>
  );
}

export function CreateSocietyForm() {
  const [state, action] = useActionState<ActionState, FormData>(createSociety, null);
  return (
    <form action={action} className="flex flex-col gap-4">
      <Field label="Society name">
        <Input name="name" required />
      </Field>
      <Field label="Address">
        <Input name="address" required />
      </Field>
      <Field label="City">
        <Input name="city" defaultValue="Bengaluru" required />
      </Field>
      <Field label="Pincode">
        <Input name="pincode" inputMode="numeric" required />
      </Field>
      <Field label="Number of units">
        <Input name="unit_count" inputMode="numeric" required />
      </Field>
      <Field label="Tank capacity (KL)">
        <Input name="tank_capacity_kl" inputMode="decimal" required />
      </Field>
      <FormFeedback state={state} />
      <SubmitButton pendingLabel="Creating…">Create society</SubmitButton>
    </form>
  );
}

export function JoinSocietyForm() {
  const [state, action] = useActionState<ActionState, FormData>(acceptInvite, null);
  return (
    <form action={action} className="flex flex-col gap-4">
      <Field label="Invite code" hint="Use the same mobile number the admin entered on the invite.">
        <Input name="code" maxLength={6} required />
      </Field>
      <FormFeedback state={state} />
      <SubmitButton pendingLabel="Joining…">Join society</SubmitButton>
    </form>
  );
}

import { redirect } from "next/navigation";
import { CreateSocietyForm, JoinSocietyForm } from "@/components/auth-forms";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { getProfile } from "@/lib/auth";
import { homePath } from "@/lib/booking";

export default async function OnboardingPage() {
  const profile = await getProfile();
  if (!profile) redirect("/login");
  if (profile.role !== "resident" || profile.society_id) redirect(homePath(profile));

  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-6 px-4 py-10">
      <div>
        <p className="text-2xl font-bold text-primary">AquaOS</p>
        <h1 className="mt-2 text-2xl font-semibold">Set up your society</h1>
        <p className="text-muted-foreground">
          Create the society you manage, or join with an invite code from your facility manager.
        </p>
      </div>
      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>I manage this society</CardTitle>
          </CardHeader>
          <CardContent>
            <CreateSocietyForm />
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>I have an invite code</CardTitle>
          </CardHeader>
          <CardContent>
            <JoinSocietyForm />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

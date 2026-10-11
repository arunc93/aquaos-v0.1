import { redirect } from "next/navigation";
import { getProfile } from "@/lib/auth";
import { homePath, type Role } from "@/lib/booking";
import type { Profile } from "@/lib/schemas";

export async function requireRole(role: Role): Promise<Profile> {
  const profile = await getProfile();
  if (!profile) {
    redirect("/login");
  }
  if (profile.role !== role) {
    redirect(homePath(profile));
  }
  if ((role === "society_admin" || role === "resident") && !profile.society_id) {
    redirect("/onboarding");
  }
  return profile;
}

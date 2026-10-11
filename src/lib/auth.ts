import { createClient } from "@/lib/supabase/server";
import { parseOne, profileSchema, type Profile } from "@/lib/schemas";

export async function getProfile(): Promise<Profile | null> {
  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) {
    return null;
  }
  const { data, error } = await supabase
    .from("profiles")
    .select("id, role, society_id, vendor_id, full_name, phone, flat_number")
    .eq("id", auth.user.id)
    .maybeSingle();
  if (error || !data) {
    return null;
  }
  return parseOne(profileSchema, data);
}

export async function signedUrl(bucket: string, path: string | null): Promise<string | null> {
  if (!path) {
    return null;
  }
  const supabase = await createClient();
  const { data } = await supabase.storage.from(bucket).createSignedUrl(path, 60 * 30);
  return data?.signedUrl ?? null;
}

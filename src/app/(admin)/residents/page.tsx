import { AnnouncementForm, InviteForm } from "@/components/simple-forms";
import { WhatsAppShare } from "@/components/whatsapp-share";
import { formatPhone } from "@/lib/phone";
import { formatWhen } from "@/lib/format";
import { requireRole } from "@/lib/guard";
import { loadSociety } from "@/lib/load";
import { createClient } from "@/lib/supabase/server";
import { announcementMessage, whatsappShareUrl } from "@/lib/whatsapp";

export default async function ResidentsPage() {
  const profile = await requireRole("society_admin");
  const societyId = profile.society_id as string;
  const society = await loadSociety(societyId);
  const supabase = await createClient();
  const [members, invites, announcements] = await Promise.all([
    supabase
      .from("profiles")
      .select("id, full_name, phone, flat_number, role")
      .eq("society_id", societyId)
      .order("full_name"),
    supabase
      .from("invites")
      .select("id, full_name, phone, flat_number, code, accepted_at")
      .eq("society_id", societyId)
      .order("created_at", { ascending: false }),
    supabase
      .from("announcements")
      .select("id, title, message, created_at")
      .eq("society_id", societyId)
      .order("created_at", { ascending: false }),
  ]);
  if (members.error || invites.error || announcements.error) {
    throw new Error(members.error?.message ?? invites.error?.message ?? announcements.error?.message);
  }

  return (
    <div className="flex flex-col gap-8">
      <h1 className="text-2xl font-semibold">Residents</h1>
      <section className="flex flex-col gap-2">
        <h2 className="text-lg font-semibold">People in this society</h2>
        <ul className="flex flex-col gap-2">
          {(members.data ?? []).map((member) => (
            <li key={member.id} className="rounded-md border border-border bg-card px-3 py-2">
              <span className="font-semibold">{member.full_name}</span>
              <span className="text-muted-foreground"> · {formatPhone(member.phone)}</span>
              {member.flat_number ? <span> · {member.flat_number}</span> : null}
              <span className="text-muted-foreground"> · {member.role === "society_admin" ? "Admin" : "Resident"}</span>
            </li>
          ))}
        </ul>
      </section>
      <section className="grid gap-6 lg:grid-cols-2">
        <div>
          <h2 className="mb-3 text-lg font-semibold">Invite a resident</h2>
          <InviteForm />
          <ul className="mt-4 flex flex-col gap-2 text-sm">
            {(invites.data ?? []).filter((invite) => !invite.accepted_at).map((invite) => (
              <li key={invite.id} className="rounded-md bg-muted px-3 py-2">
                {invite.full_name}, {invite.flat_number}: code <span className="font-mono font-semibold">{invite.code}</span>
              </li>
            ))}
          </ul>
        </div>
        <div>
          <h2 className="mb-3 text-lg font-semibold">Announcement</h2>
          <AnnouncementForm />
        </div>
      </section>
      <section className="flex flex-col gap-3">
        <h2 className="text-lg font-semibold">Posted</h2>
        {(announcements.data ?? []).length === 0 ? <p className="text-muted-foreground">No announcements yet.</p> : null}
        {(announcements.data ?? []).map((item) => (
          <article key={item.id} className="rounded-lg border border-border bg-card p-4">
            <h3 className="font-semibold">{item.title}</h3>
            <p className="whitespace-pre-wrap">{item.message}</p>
            <p className="text-sm text-muted-foreground">{formatWhen(item.created_at)}</p>
            <div className="mt-3">
              <WhatsAppShare
                href={whatsappShareUrl(
                  announcementMessage({
                    societyName: society.name,
                    title: item.title,
                    message: item.message,
                  }),
                )}
              />
            </div>
          </article>
        ))}
      </section>
    </div>
  );
}

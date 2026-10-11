import { LoginForm } from "@/components/auth-forms";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ setup?: string }>;
}) {
  const query = await searchParams;
  return (
    <div className="flex flex-col gap-4">
      {query.setup ? (
        <p className="rounded-md bg-amber-50 px-3 py-2 text-sm text-amber-950">
          Add the Supabase URL and anon key to .env.local, then restart the app. The README lists the steps.
        </p>
      ) : null}
      <LoginForm />
    </div>
  );
}

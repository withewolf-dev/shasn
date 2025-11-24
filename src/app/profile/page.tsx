import { redirect } from 'next/navigation';

import { ProfileForm } from '@/components/profile/profile-form';
import { createServerSupabaseClient } from '@/lib/supabase/server-client';

export default async function ProfilePage() {
  const supabase = createServerSupabaseClient();
  const [
    {
      data: { user },
    },
    { data: profile },
  ] = await Promise.all([
    supabase.auth.getUser(),
    supabase.from('profiles').select('display_name, avatar_seed, reputation').maybeSingle(),
  ]);

  if (!user) {
    redirect('/auth/login');
  }

  return (
    <main className="mx-auto flex min-h-screen max-w-2xl flex-col gap-6 px-6 py-12">
      <header className="space-y-2">
        <p className="text-xs uppercase tracking-[0.3em] text-zinc-500">Commander Profile</p>
        <h1 className="text-3xl font-semibold">Identity & Reputation</h1>
        <p className="text-sm text-zinc-500">
          Your profile fuels lobbies, coalitions, and recaps. Keep it sharp.
        </p>
      </header>

      <section className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
        <ProfileForm
          initialDisplayName={profile?.display_name ?? ''}
          initialAvatarSeed={profile?.avatar_seed ?? ''}
        />
        <p className="mt-4 text-xs uppercase tracking-[0.3em] text-zinc-500">
          Reputation Score: {profile?.reputation ?? 0}
        </p>
      </section>
    </main>
  );
}


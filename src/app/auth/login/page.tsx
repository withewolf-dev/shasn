import { redirect } from 'next/navigation';

import { MagicLinkForm } from '@/components/auth/magic-link-form';
import { createServerSupabaseClient } from '@/lib/supabase/server-client';

export default async function LoginPage() {
  const supabase = createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (user) {
    redirect('/profile');
  }

  return (
    <main className="mx-auto flex min-h-screen max-w-md flex-col justify-center px-6 py-12">
      <header className="space-y-3 text-center">
        <p className="text-xs uppercase tracking-[0.3em] text-zinc-500">Authentication</p>
        <h1 className="text-3xl font-semibold">Sign in to SHASN</h1>
        <p className="text-sm text-zinc-500">
          Receive a secure magic link to access private lobbies and negotiation rooms.
        </p>
      </header>
      <section className="mt-8 rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
        <MagicLinkForm />
      </section>
    </main>
  );
}


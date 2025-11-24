import { redirect } from 'next/navigation';

import { createLobby } from '@/server/lobby';
import { createServerSupabaseClient } from '@/lib/supabase/server-client';

export default async function LobbiesPage() {
  const supabase = createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect('/auth/login');
  }

  async function createLobbyAction(formData: FormData) {
    'use server';

    const title = formData.get('title')?.toString().trim() || 'Untitled Session';
    const maxPlayersRaw = formData.get('maxPlayers')?.toString() ?? '4';
    const maxPlayers = Math.min(5, Math.max(2, Number(maxPlayersRaw) || 4));

    const { sessionId } = await createLobby({ title, maxPlayers });
    redirect(`/lobby/${sessionId}`);
  }

  return (
    <main className="mx-auto flex min-h-screen max-w-3xl flex-col gap-8 px-6 py-12">
      <header className="space-y-2 text-center">
        <p className="text-xs uppercase tracking-[0.3em] text-zinc-500">Lobby</p>
        <h1 className="text-3xl font-semibold">Create a new lobby</h1>
        <p className="text-sm text-zinc-500 dark:text-zinc-400">
          Start a new SHASN session, then share the URL with your friends.
        </p>
      </header>

      <section className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
        <form action={createLobbyAction} className="space-y-6">
          <div className="space-y-2">
            <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-200">
              Lobby title
              <input
                type="text"
                name="title"
                placeholder="Friday Night Politics"
                className="mt-2 w-full rounded-xl border border-zinc-300 bg-white px-4 py-3 text-base text-zinc-900 shadow-sm focus:border-zinc-900 focus:outline-none dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-50"
              />
            </label>
          </div>

          <div className="space-y-2">
            <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-200">
              Player count
              <input
                type="number"
                name="maxPlayers"
                min={2}
                max={5}
                defaultValue={4}
                className="mt-2 w-24 rounded-xl border border-zinc-300 bg-white px-3 py-2 text-base text-zinc-900 shadow-sm focus:border-zinc-900 focus:outline-none dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-50"
              />
            </label>
            <p className="text-xs text-zinc-500 dark:text-zinc-400">SHASN supports 2–5 players.</p>
          </div>

          <button
            type="submit"
            className="inline-flex items-center justify-center rounded-full bg-black px-5 py-3 text-sm font-semibold text-white transition hover:bg-zinc-800 dark:bg-zinc-50 dark:text-zinc-900 dark:hover:bg-white"
          >
            Create lobby
          </button>
        </form>
      </section>
    </main>
  );
}



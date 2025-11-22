import { notFound } from 'next/navigation';

import { ReadyToggle } from '@/components/lobby/ready-toggle';
import { createServerSupabaseClient } from '@/lib/supabase';

interface LobbyPageProps {
  params: { sessionId: string };
}

export default async function LobbyPage({ params }: LobbyPageProps) {
  const sessionId = params.sessionId;

  try {
    const supabase = createServerSupabaseClient();

    const [
      {
        data: session,
        error: sessionError,
      },
      {
        data: players,
        error: playersError,
      },
      {
        data: { user } = { user: null },
      },
    ] = await Promise.all([
      supabase
        .from('sessions')
        .select('id, title, status, host_id, created_at')
        .eq('id', sessionId)
        .single(),
      supabase
        .from('session_players')
        .select(
          `
          session_id,
          profile_id,
          seat_order,
          is_ready,
          profiles (
            display_name,
            avatar_seed
          )
        `,
        )
        .eq('session_id', sessionId)
        .order('seat_order'),
      supabase.auth.getUser(),
    ]);

    if (sessionError) {
      if (sessionError.code === 'PGRST116') {
        notFound();
      }
      throw sessionError;
    }

    if (playersError) {
      throw playersError;
    }

    const hostDisplayName =
      players?.find((player) => player.profile_id === session?.host_id)?.profiles?.display_name ??
      'Host';

    return (
      <main className="mx-auto flex min-h-screen max-w-5xl flex-col gap-8 px-6 py-12">
        <header className="space-y-2">
          <p className="text-xs uppercase tracking-[0.3em] text-zinc-500">Lobby</p>
          <h1 className="text-3xl font-semibold">{session?.title}</h1>
          <p className="text-sm text-zinc-600 dark:text-zinc-400">
            Host: <span className="font-medium text-zinc-900 dark:text-zinc-100">{hostDisplayName}</span>
          </p>
          <p className="text-xs uppercase tracking-[0.3em] text-zinc-500">
            Status: {session?.status ?? 'unknown'}
          </p>
        </header>

        <section className="space-y-4 rounded-2xl border border-zinc-200 p-6 shadow-sm dark:border-zinc-800">
          <div>
            <h2 className="text-xl font-semibold">Players</h2>
            <p className="text-sm text-zinc-500">Ready up to signal the host you are prepared.</p>
          </div>
          <ul className="divide-y divide-zinc-100 text-sm dark:divide-zinc-800">
            {players?.map((player) => {
              const isViewer = player.profile_id === user?.id;
              const name = player.profiles?.display_name ?? `Player ${player.seat_order + 1}`;

              return (
                <li key={player.profile_id} className="flex items-center justify-between py-3">
                  <div>
                    <p className="text-base font-medium text-zinc-900 dark:text-zinc-100">{name}</p>
                    <p className="text-xs uppercase tracking-[0.3em] text-zinc-500">
                      Seat {player.seat_order + 1}
                    </p>
                  </div>
                  {isViewer ? (
                    <ReadyToggle sessionId={sessionId} initialReady={player.is_ready} />
                  ) : (
                    <span
                      className={`rounded-full px-3 py-1 text-xs font-semibold ${
                        player.is_ready
                          ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-200'
                          : 'bg-zinc-100 text-zinc-600 dark:bg-zinc-900 dark:text-zinc-400'
                      }`}
                    >
                      {player.is_ready ? 'Ready' : 'Waiting'}
                    </span>
                  )}
                </li>
              );
            })}
          </ul>
        </section>
      </main>
    );
  } catch (error) {
    const message =
      error instanceof Error ? error.message : 'Unable to load lobby. Configure Supabase credentials.';

    return (
      <main className="mx-auto flex min-h-screen max-w-3xl flex-col items-center justify-center gap-4 px-6 text-center">
        <h1 className="text-2xl font-semibold">Lobby unavailable</h1>
        <p className="text-sm text-zinc-500">{message}</p>
        <p className="text-xs text-zinc-400">
          Ensure `.env.local` includes `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY`.
        </p>
      </main>
    );
  }
}


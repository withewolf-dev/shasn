import Link from 'next/link';

import { ReadyToggle } from '@/components/lobby/ready-toggle';
import type { SessionPlayerRow, TurnRow } from '@/types/database';

interface GameSidebarProps {
  sessionId: string;
  players: SessionPlayerRow[];
  activeTurn: TurnRow | null;
  currentUserId: string;
}

export function GameSidebar({ sessionId, players, activeTurn, currentUserId }: GameSidebarProps) {
  return (
    <aside className="space-y-6 rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
      <section className="space-y-2">
        <p className="text-xs uppercase tracking-[0.3em] text-zinc-500">Turn Order</p>
        {activeTurn ? (
          <div>
            <h3 className="text-lg font-semibold text-zinc-900 dark:text-zinc-50">
              Active: {shortName(activeTurn.active_player, players)}
            </h3>
            <p className="text-xs text-zinc-500">
              Neighbor reader: {shortName(activeTurn.neighbor_reader, players) ?? 'TBD'}
            </p>
          </div>
        ) : (
          <p className="text-sm text-zinc-500">No turns recorded yet.</p>
        )}
      </section>

      <section className="space-y-3">
        <header className="flex items-center justify-between">
          <h3 className="text-sm font-semibold uppercase tracking-[0.3em] text-zinc-500">Players</h3>
          <Link className="text-xs text-zinc-600 underline dark:text-zinc-300" href={`/lobby/${sessionId}`}>
            Back to lobby
          </Link>
        </header>
        <ul className="space-y-2 text-sm">
          {players.map((player) => (
            <li
              key={player.profile_id}
              className="flex items-center justify-between rounded-xl border border-zinc-200 px-3 py-2 dark:border-zinc-800"
            >
              <div>
                <p className="font-medium text-zinc-900 dark:text-zinc-50">
                  {player.profiles?.display_name ?? player.profile_id.slice(0, 6)}
                </p>
                <p className="text-xs text-zinc-500">Seat {player.seat_order + 1}</p>
              </div>
              {player.profile_id === currentUserId ? (
                <ReadyToggle sessionId={sessionId} initialReady={player.is_ready} />
              ) : (
                <span className="text-xs uppercase tracking-[0.3em] text-zinc-500">
                  {player.is_ready ? 'Ready' : 'Waiting'}
                </span>
              )}
            </li>
          ))}
        </ul>
      </section>
    </aside>
  );
}

function shortName(profileId: string | null, players: SessionPlayerRow[]) {
  if (!profileId) return null;
  const player = players.find((p) => p.profile_id === profileId);
  return player?.profiles?.display_name ?? `${profileId.slice(0, 6)}…`;
}


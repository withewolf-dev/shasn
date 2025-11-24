'use client';

import { useState, useTransition } from 'react';
import Link from 'next/link';

import { ReadyToggle } from '@/components/lobby/ready-toggle';
import type { SessionPlayerRow, TurnRow } from '@/types/database';
import { forceCompleteSession } from '@/server/game-actions';

interface GameSidebarProps {
  sessionId: string;
  players: SessionPlayerRow[];
  activeTurn: TurnRow | null;
  currentUserId: string;
  hostId: string;
}

export function GameSidebar({
  sessionId,
  players,
  activeTurn,
  currentUserId,
  hostId,
}: GameSidebarProps) {
  const [summary, setSummary] = useState('');
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [isCompleting, startTransition] = useTransition();

  function completeSession() {
    setStatusMessage(null);
    startTransition(async () => {
      try {
        const formData = new FormData();
        formData.set('sessionId', sessionId);
        if (summary.trim()) {
          formData.set('summary', summary.trim());
        }
        await forceCompleteSession(formData);
        setStatusMessage('Session marked complete.');
      } catch (error) {
        setStatusMessage(error instanceof Error ? error.message : 'Unable to complete session.');
      }
    });
  }

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

      <section className="space-y-1 rounded-2xl border border-dashed border-amber-200 bg-amber-50 p-4 text-sm text-amber-900 dark:border-amber-400/40 dark:bg-amber-950/30 dark:text-amber-200">
        <p className="text-xs font-semibold uppercase tracking-[0.3em]">MVP Notice</p>
        <p>
          Ideologue Level 4/6 powers aren’t enabled in this playtest. Only passive income applies—treat any
          advanced abilities as house rules for now.
        </p>
      </section>

      {currentUserId === hostId ? (
        <section className="space-y-3 rounded-2xl border border-zinc-200 bg-zinc-50 p-4 text-sm dark:border-zinc-800 dark:bg-zinc-900/60">
          <header>
            <p className="text-xs uppercase tracking-[0.3em] text-zinc-500">Host Controls</p>
            <p className="text-xs text-zinc-500">
              Use when everyone agrees the game is over (all majorities or manual arbitration).
            </p>
          </header>
          <textarea
            className="w-full rounded-xl border border-zinc-300 bg-white p-2 text-sm dark:border-zinc-700 dark:bg-zinc-800"
            rows={3}
            maxLength={280}
            placeholder="Optional winner summary..."
            value={summary}
            onChange={(event) => setSummary(event.currentTarget.value)}
          />
          <button
            type="button"
            onClick={completeSession}
            disabled={isCompleting}
            className="w-full rounded-full bg-zinc-900 px-4 py-2 text-xs font-semibold uppercase tracking-[0.2em] text-white disabled:opacity-50"
          >
            {isCompleting ? 'Marking…' : 'Mark Game Complete'}
          </button>
          {statusMessage ? <p className="text-xs text-zinc-500">{statusMessage}</p> : null}
        </section>
      ) : null}
    </aside>
  );
}

function shortName(profileId: string | null, players: SessionPlayerRow[]) {
  if (!profileId) return null;
  const player = players.find((p) => p.profile_id === profileId);
  return player?.profiles?.display_name ?? `${profileId.slice(0, 6)}…`;
}


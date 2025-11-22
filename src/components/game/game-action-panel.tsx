'use client';

import { useMemo, useState, useTransition } from 'react';

import { RESOURCE_LABELS } from '@/lib/rules';
import type {
  IdeologyCardRow,
  TurnRow,
  VoteBankCardRow,
  ZoneRow,
} from '@/types/database';
import { submitIdeologyAnswer, submitInfluenceAction } from '@/server/game-actions';

interface GameActionPanelProps {
  sessionId: string;
  currentUserId: string;
  activeTurn: TurnRow | null;
  ideologyCards: IdeologyCardRow[];
  voteBankCards: VoteBankCardRow[];
  zones: ZoneRow[];
}

export function GameActionPanel({
  sessionId,
  currentUserId,
  activeTurn,
  ideologyCards,
  voteBankCards,
  zones,
}: GameActionPanelProps) {
  const [ideologyCardId, setIdeologyCardId] = useState(ideologyCards[0]?.id ?? '');
  const [choice, setChoice] = useState<'answer_a' | 'answer_b'>('answer_a');
  const [voteBankCardId, setVoteBankCardId] = useState(voteBankCards[0]?.id ?? '');
  const [zoneId, setZoneId] = useState(zones[0]?.id ?? '');
  const [message, setMessage] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const canAct = activeTurn?.active_player === currentUserId;
  const turnId = activeTurn?.id ?? null;

  const selectedIdeologyCard = useMemo(
    () => ideologyCards.find((card) => card.id === ideologyCardId),
    [ideologyCards, ideologyCardId],
  );

  function handleIdeologySubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!turnId) return;
    setMessage(null);

    startTransition(async () => {
      try {
        const payload = new FormData();
        payload.set('sessionId', sessionId);
        payload.set('turnId', String(turnId));
        payload.set('cardId', ideologyCardId);
        payload.set('choice', choice);
        await submitIdeologyAnswer(payload);
        setMessage('Ideology answer resolved.');
      } catch (error) {
        setMessage(error instanceof Error ? error.message : 'Unable to resolve ideology card.');
      }
    });
  }

  function handleInfluenceSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!turnId) return;
    setMessage(null);

    startTransition(async () => {
      try {
        const payload = new FormData();
        payload.set('sessionId', sessionId);
        payload.set('turnId', String(turnId));
        payload.set('voteBankCardId', voteBankCardId);
        payload.set('zoneId', zoneId);
        await submitInfluenceAction(payload);
        setMessage('Voters placed successfully.');
      } catch (error) {
        setMessage(error instanceof Error ? error.message : 'Unable to influence voters.');
      }
    });
  }

  return (
    <section className="space-y-6 rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
      <header>
        <p className="text-xs uppercase tracking-[0.3em] text-zinc-500">Actions</p>
        <h2 className="text-xl font-semibold">Turn Controls</h2>
        {!canAct ? (
          <p className="text-xs text-zinc-500">Waiting for your turn…</p>
        ) : (
          <p className="text-xs text-emerald-500">It&apos;s your turn. Take actions below.</p>
        )}
      </header>

      <form onSubmit={handleIdeologySubmit} className="space-y-3">
        <h3 className="text-sm font-semibold uppercase tracking-[0.3em] text-zinc-500">
          Ideology Card
        </h3>
        <select
          className="w-full rounded-xl border border-zinc-300 bg-white px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-800"
          value={ideologyCardId}
          onChange={(event) => setIdeologyCardId(event.currentTarget.value)}
          disabled={!canAct || !ideologyCards.length}
        >
          {ideologyCards.map((card) => (
            <option key={card.id} value={card.id}>
              {card.prompt.slice(0, 60)}…
            </option>
          ))}
        </select>
        <div className="grid gap-2 text-sm">
          <label className="flex items-center gap-2">
            <input
              type="radio"
              name="ideology-choice"
              value="answer_a"
              checked={choice === 'answer_a'}
              onChange={() => setChoice('answer_a')}
              disabled={!canAct}
            />
            {selectedIdeologyCard?.answer_a.text ?? 'Answer A'}
          </label>
          <label className="flex items-center gap-2">
            <input
              type="radio"
              name="ideology-choice"
              value="answer_b"
              checked={choice === 'answer_b'}
              onChange={() => setChoice('answer_b')}
              disabled={!canAct}
            />
            {selectedIdeologyCard?.answer_b.text ?? 'Answer B'}
          </label>
        </div>
        <button
          type="submit"
          disabled={!canAct || isPending}
          className="w-full rounded-full bg-black px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
        >
          {isPending ? 'Resolving…' : 'Resolve Ideology Card'}
        </button>
      </form>

      <form onSubmit={handleInfluenceSubmit} className="space-y-3">
        <h3 className="text-sm font-semibold uppercase tracking-[0.3em] text-zinc-500">
          Influence Voters
        </h3>
        <select
          className="w-full rounded-xl border border-zinc-300 bg-white px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-800"
          value={voteBankCardId}
          onChange={(event) => setVoteBankCardId(event.currentTarget.value)}
          disabled={!canAct || !voteBankCards.length}
        >
          {voteBankCards.map((card) => (
            <option key={card.id} value={card.id}>
              {card.voters} voters — {describeCost(card.cost)}
            </option>
          ))}
        </select>
        <select
          className="w-full rounded-xl border border-zinc-300 bg-white px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-800"
          value={zoneId}
          onChange={(event) => setZoneId(event.currentTarget.value)}
          disabled={!canAct || !zones.length}
        >
          {zones.map((zone) => (
            <option key={zone.id} value={zone.id}>
              {zone.display_name} (needs {zone.majority_required})
            </option>
          ))}
        </select>
        <button
          type="submit"
          disabled={!canAct || isPending}
          className="w-full rounded-full bg-black px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
        >
          {isPending ? 'Placing…' : 'Place Voters'}
        </button>
      </form>

      {message ? <p className="text-xs text-zinc-500">{message}</p> : null}
    </section>
  );
}

function describeCost(cost: Record<string, number>) {
  return Object.entries(cost)
    .map(([key, value]) => `${value} ${RESOURCE_LABELS[key as keyof typeof RESOURCE_LABELS] ?? key}`)
    .join(', ');
}


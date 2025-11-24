'use client';

import { useEffect, useMemo, useState, useTransition } from 'react';

import { RESOURCE_LABELS, getConspiracyEffectConfig } from '@/lib/rules';
import type {
  IdeologyCardRow,
  SessionPlayerRow,
  TurnRow,
  VoteBankCardRow,
  ZoneRow,
} from '@/types/database';
import {
  submitIdeologyAnswer,
  submitInfluenceAction,
  buyConspiracyCard,
  playConspiracyCard,
} from '@/server/game-actions';

interface GameActionPanelProps {
  sessionId: string;
  currentUserId: string;
  activeTurn: TurnRow | null;
  ideologyCards: IdeologyCardRow[];
  voteBankCards: VoteBankCardRow[];
  conspiracyCards: { id: string; title: string; cost: number; description: string }[];
  currentHand: string[];
  zones: ZoneRow[];
  players: SessionPlayerRow[];
}

export function GameActionPanel({
  sessionId,
  currentUserId,
  activeTurn,
  ideologyCards,
  voteBankCards,
  conspiracyCards,
  currentHand,
  zones,
  players,
}: GameActionPanelProps) {
  const ideologyCard =
    (activeTurn?.state as { ideology_preview?: IdeologyCardRow[] } | null)?.ideology_preview?.[0] ??
    ideologyCards[0] ??
    null;
  const voteBankCard =
    (activeTurn?.state as { vote_bank_preview?: VoteBankCardRow[] } | null)?.vote_bank_preview?.[0] ??
    voteBankCards[0] ??
    null;
  const conspiracyCard = useMemo(
    () =>
      conspiracyCards.find((card) => getConspiracyEffectConfig(card.id)?.implemented) ?? null,
    [conspiracyCards],
  );
  const [choice, setChoice] = useState<'answer_a' | 'answer_b'>('answer_a');
  const [zoneId, setZoneId] = useState(zones[0]?.id ?? '');
  const [message, setMessage] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const canAct = activeTurn?.active_player === currentUserId;
  const turnId = activeTurn?.id ?? null;
  const turnStatus = (activeTurn?.state as { status?: string } | null)?.status ?? 'awaiting-ideology-answer';
  const canAnswer = canAct && turnStatus === 'awaiting-ideology-answer';
  const canInfluence = canAct && turnStatus === 'awaiting-influence';

  function handleIdeologySubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!turnId || !ideologyCard) return;
    setMessage(null);

    startTransition(async () => {
      try {
        const payload = new FormData();
        payload.set('sessionId', sessionId);
        payload.set('turnId', String(turnId));
        payload.set('cardId', ideologyCard.id);
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
    if (!turnId || !voteBankCard) return;
    setMessage(null);

    startTransition(async () => {
      try {
        const payload = new FormData();
        payload.set('sessionId', sessionId);
        payload.set('turnId', String(turnId));
        payload.set('voteBankCardId', voteBankCard.id);
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
        ) : turnStatus === 'awaiting-influence' ? (
          <p className="text-xs text-amber-500">Ideology resolved. Influence voters to end turn.</p>
        ) : turnStatus === 'awaiting-ideology-answer' ? (
          <p className="text-xs text-emerald-500">Answer the ideology card to proceed.</p>
        ) : (
          <p className="text-xs text-zinc-500">Turn completed. Awaiting next rotation.</p>
        )}
      </header>

      <div className="rounded-2xl border border-dashed border-sky-200 bg-sky-50 p-3 text-xs text-sky-900 dark:border-sky-400/40 dark:bg-sky-950/30 dark:text-sky-200">
        <p className="font-semibold uppercase tracking-[0.3em]">Playtest Scope</p>
        <p>
          Trades + ideologue L4/L6 powers are disabled; only Media Smear conspiracies work. See
          <span className="font-semibold"> docs/build_status.md</span> for the full MVP notes.
        </p>
      </div>

      <form onSubmit={handleIdeologySubmit} className="space-y-3">
        <h3 className="text-sm font-semibold uppercase tracking-[0.3em] text-zinc-500">
          Ideology Card
        </h3>
        {ideologyCard ? (
          <div className="rounded-xl border border-zinc-200 p-4 text-sm dark:border-zinc-800">
            <p className="font-semibold text-zinc-900 dark:text-zinc-50">{ideologyCard.prompt}</p>
            <div className="mt-3 space-y-2">
              <label className="flex gap-2">
            <input
              type="radio"
              name="ideology-choice"
              value="answer_a"
              checked={choice === 'answer_a'}
              onChange={() => setChoice('answer_a')}
                  disabled={!canAnswer}
            />
                <span>{ideologyCard.answer_a.text}</span>
          </label>
              <label className="flex gap-2">
            <input
              type="radio"
              name="ideology-choice"
              value="answer_b"
              checked={choice === 'answer_b'}
              onChange={() => setChoice('answer_b')}
                  disabled={!canAnswer}
            />
                <span>{ideologyCard.answer_b.text}</span>
          </label>
        </div>
          </div>
        ) : (
          <p className="text-xs text-zinc-500">Deck exhausted. Await reshuffle.</p>
        )}
        <button
          type="submit"
          disabled={!canAnswer || isPending || !ideologyCard}
          className="w-full rounded-full bg-black px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
        >
          {isPending ? 'Resolving…' : 'Resolve Ideology Card'}
        </button>
      </form>

      <form onSubmit={handleInfluenceSubmit} className="space-y-3">
        <h3 className="text-sm font-semibold uppercase tracking-[0.3em] text-zinc-500">
          Influence Voters
        </h3>
        {voteBankCard ? (
          <div className="rounded-xl border border-zinc-200 p-4 text-sm dark:border-zinc-800">
            <p className="font-semibold text-zinc-900 dark:text-zinc-50">
              {voteBankCard.voters} voters available
            </p>
            <p className="text-xs text-zinc-500">
              Cost: {describeCost(voteBankCard.cost)}
              {voteBankCard.marked_cost ? ` · Marked: ${voteBankCard.marked_cost}` : null}
            </p>
          </div>
        ) : (
          <p className="text-xs text-zinc-500">Vote bank depleted. Await refresh.</p>
        )}
        <select
          className="w-full rounded-xl border border-zinc-300 bg-white px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-800"
          value={zoneId}
          onChange={(event) => setZoneId(event.currentTarget.value)}
          disabled={!canInfluence || !zones.length}
        >
          {zones.map((zone) => (
            <option key={zone.id} value={zone.id}>
              {zone.display_name} (needs {zone.majority_required})
            </option>
          ))}
        </select>
        <button
          type="submit"
          disabled={!canInfluence || isPending || !voteBankCard}
          className="w-full rounded-full bg-black px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
        >
          {isPending ? 'Placing…' : 'Place Voters'}
        </button>
      </form>

      {message ? <p className="text-xs text-zinc-500">{message}</p> : null}

      <ConspiracySection
        sessionId={sessionId}
        currentUserId={currentUserId}
        turnId={turnId}
        canAct={canAct}
        turnStatus={turnStatus}
        card={conspiracyCard}
        currentHand={currentHand}
        knownCards={conspiracyCards}
        players={players}
      />
    </section>
  );
}

function ConspiracySection({
  sessionId,
  currentUserId,
  turnId,
  canAct,
  turnStatus,
  card,
  currentHand,
  knownCards,
  players,
}: {
  sessionId: string;
  currentUserId: string;
  turnId: number | null;
  canAct: boolean;
  turnStatus: string;
  card: { id: string; title: string; cost: number; description: string } | null;
  currentHand: string[];
  knownCards: { id: string; title: string; cost: number; description: string }[];
  players: SessionPlayerRow[];
}) {
  const [message, setMessage] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const [selectedCardId, setSelectedCardId] = useState<string | null>(currentHand[0] ?? null);
  const [selectedTargetId, setSelectedTargetId] = useState<string>('');

  useEffect(() => {
    if (!selectedCardId || !currentHand.includes(selectedCardId)) {
      setSelectedCardId(currentHand[0] ?? null);
    }
  }, [currentHand, selectedCardId]);

  function buyCard() {
    if (!turnId || !card) return;
    setMessage(null);

    startTransition(async () => {
      try {
        const payload = new FormData();
        payload.set('sessionId', sessionId);
        payload.set('turnId', String(turnId));
        await buyConspiracyCard(payload);
        setMessage(`Acquired ${card.title}.`);
      } catch (error) {
        setMessage(error instanceof Error ? error.message : 'Unable to buy card.');
      }
    });
  }

  const selectedConfig = getConspiracyEffectConfig(selectedCardId);
  const requiresTarget = Boolean(selectedConfig?.requiresTarget);
  const targetPool = useMemo(
    () => players.filter((player) => player.profile_id !== currentUserId),
    [players, currentUserId],
  );
  const isImplemented = selectedConfig?.implemented ?? false;

  useEffect(() => {
    if (!requiresTarget) {
      setSelectedTargetId('');
      return;
    }
    if (selectedTargetId && targetPool.some((player) => player.profile_id === selectedTargetId)) {
      return;
    }
    setSelectedTargetId(targetPool[0]?.profile_id ?? '');
  }, [requiresTarget, selectedTargetId, targetPool]);

  function playCard() {
    if (!turnId || !selectedCardId) return;
    if (requiresTarget && !selectedTargetId) {
      setMessage('Choose a target player for this conspiracy.');
      return;
    }
    if (!isImplemented) {
      setMessage('This conspiracy effect is coming soon.');
      return;
    }
    setMessage(null);

    startTransition(async () => {
      try {
        const payload = new FormData();
        payload.set('sessionId', sessionId);
        payload.set('turnId', String(turnId));
        payload.set('cardId', selectedCardId);
        if (selectedTargetId) {
          payload.set('targetId', selectedTargetId);
        }
        await playConspiracyCard(payload);
        setMessage('Conspiracy played.');
      } catch (error) {
        setMessage(error instanceof Error ? error.message : 'Unable to play card.');
      }
    });
  }

  const handCards = currentHand
    .map((handId) => knownCards.find((c) => c.id === handId))
    .filter((card): card is { id: string; title: string; cost: number; description: string } => Boolean(card));

  return (
    <section className="space-y-3 rounded-2xl border border-zinc-200 p-4 dark:border-zinc-800">
      <header className="flex items-center justify-between">
        <div>
          <p className="text-xs uppercase tracking-[0.3em] text-zinc-500">Conspiracy Deck</p>
          <p className="text-sm text-zinc-600 dark:text-zinc-400">
            Hand size: {currentHand.length}
          </p>
        </div>
      </header>
      {card ? (
        <div className="space-y-2 text-sm text-zinc-700 dark:text-zinc-200">
          <p className="font-semibold">{card.title}</p>
          <p className="text-xs text-zinc-500">{card.description}</p>
          <p className="text-xs text-zinc-500">Cost: {card.cost} resources</p>
          <button
            type="button"
            onClick={buyCard}
            disabled={!canAct || turnStatus === 'completed' || isPending}
            className="rounded-full bg-black px-4 py-2 text-xs font-semibold text-white disabled:opacity-50"
          >
            {isPending ? 'Processing…' : 'Buy & Draw'}
          </button>
        </div>
      ) : (
        <p className="text-xs text-zinc-500">Deck exhausted.</p>
      )}
      <div className="space-y-2">
        <p className="text-xs uppercase tracking-[0.3em] text-zinc-500">In hand</p>
        {handCards.length ? (
          <>
            <select
              className="w-full rounded-xl border border-zinc-300 bg-white px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-800"
              value={selectedCardId ?? ''}
              onChange={(event) => setSelectedCardId(event.currentTarget.value)}
            >
              {handCards.map((handCard) => (
                <option key={handCard.id} value={handCard.id}>
                  {handCard.title}
                </option>
              ))}
            </select>
            {selectedConfig?.instructions ? (
              <p className="text-xs text-zinc-500">{selectedConfig.instructions}</p>
            ) : null}
            {requiresTarget ? (
              <div className="space-y-1">
                <label className="text-xs uppercase tracking-[0.3em] text-zinc-500">Target</label>
                <select
                  className="w-full rounded-xl border border-zinc-300 bg-white px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-800"
                  value={selectedTargetId}
                  onChange={(event) => setSelectedTargetId(event.currentTarget.value)}
                >
                  <option value="">Choose opponent</option>
                  {targetPool.map((player) => (
                    <option key={player.profile_id} value={player.profile_id}>
                      {player.profiles?.display_name ?? player.profile_id.slice(0, 6)}
                    </option>
                  ))}
                </select>
              </div>
            ) : null}
            <button
              type="button"
              onClick={playCard}
              disabled={!selectedCardId || isPending || (requiresTarget && !selectedTargetId) || !isImplemented}
              className="rounded-full border border-zinc-300 px-4 py-2 text-xs font-semibold text-zinc-700 transition hover:border-zinc-900 hover:text-zinc-900 dark:border-zinc-700 dark:text-zinc-200 dark:hover:border-zinc-200"
            >
              {isPending ? 'Playing…' : 'Play Selected'}
            </button>
          </>
        ) : (
          <p className="text-xs text-zinc-500">No conspiracies in hand.</p>
        )}
      </div>
      {message ? <p className="text-xs text-zinc-500">{message}</p> : null}
    </section>
  );
}

function describeCost(cost: Record<string, number>) {
  return Object.entries(cost)
    .map(([key, value]) => `${value} ${RESOURCE_LABELS[key as keyof typeof RESOURCE_LABELS] ?? key}`)
    .join(', ');
}


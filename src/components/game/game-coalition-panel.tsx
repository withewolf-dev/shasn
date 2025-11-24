'use client';

import { useMemo, useState, useTransition } from 'react';

import { requestCoalition } from '@/server/game-actions';
import type { SessionPlayerRow, ZoneControlRow } from '@/types/database';

interface GameCoalitionPanelProps {
  sessionId: string;
  currentUserId: string;
  zones: ZoneControlRow[];
  players?: SessionPlayerRow[];
}

export function GameCoalitionPanel({ sessionId, currentUserId, zones }: GameCoalitionPanelProps) {
  const [message, setMessage] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const [selectedZone, setSelectedZone] = useState<string>('');

  const eligibleZones = useMemo(
    () =>
      zones.filter(
        (zone) =>
          !zone.coalition &&
          zone.majority_owner &&
          zone.majority_owner !== currentUserId &&
          (zone.voter_counts?.[currentUserId] ?? 0) > 0,
      ),
    [zones, currentUserId],
  );

  const selectedZoneData = useMemo(
    () => zones.find((zone) => zone.zone_id === selectedZone),
    [zones, selectedZone],
  );
  const defaultPartner = selectedZoneData?.majority_owner ?? '';

  function submit() {
    if (!selectedZone || !defaultPartner) return;
    setMessage(null);

    startTransition(async () => {
      try {
        const formData = new FormData();
        formData.set('sessionId', sessionId);
        formData.set('zoneId', selectedZone);
        formData.set('partnerId', defaultPartner);
        await requestCoalition(formData);
        setMessage('Coalition request sent; swap highest ideology cards with your partner.');
      } catch (error) {
        setMessage(error instanceof Error ? error.message : 'Unable to request coalition.');
      }
    });
  }

  return (
    <section className="space-y-3 rounded-2xl border border-zinc-200 bg-white p-4 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
      <header>
        <p className="text-xs uppercase tracking-[0.3em] text-zinc-500">Coalitions</p>
        <p className="text-sm text-zinc-600 dark:text-zinc-400">
          Combine votes with an ally to hold contested zones.
        </p>
      </header>
      {eligibleZones.length === 0 ? (
        <p className="text-xs text-zinc-500">
          You need matching voters in a rival’s zone to initiate a coalition.
        </p>
      ) : (
        <>
          <select
            className="w-full rounded-xl border border-zinc-300 bg-white px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-800"
            value={selectedZone}
            onChange={(event) => setSelectedZone(event.currentTarget.value)}
          >
            <option value="">Select contested zone</option>
            {eligibleZones.map((zone) => (
              <option key={zone.zone_id} value={zone.zone_id}>
                Zone {zone.zone_id.slice(0, 4)}… vs {zone.majority_owner?.slice(0, 4)}…
              </option>
            ))}
          </select>
          <p className="rounded-xl border border-dashed border-zinc-300 px-3 py-2 text-sm text-zinc-600 dark:border-zinc-700 dark:text-zinc-300">
            Partner: {selectedZoneData?.majority_owner?.slice(0, 6) ?? '—'}
          </p>
          <button
            type="button"
            onClick={submit}
            disabled={!selectedZone || !defaultPartner || isPending}
            className="w-full rounded-full bg-black px-4 py-2 text-xs font-semibold text-white disabled:opacity-50"
          >
            {isPending ? 'Offering…' : 'Offer coalition'}
          </button>
        </>
      )}
      {message ? <p className="text-xs text-zinc-500">{message}</p> : null}
    </section>
  );
}

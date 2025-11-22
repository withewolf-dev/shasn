'use client';

import { useState, useTransition } from 'react';

import { setReadyState } from '@/server/lobby';

interface ReadyToggleProps {
  sessionId: string;
  initialReady: boolean;
}

export function ReadyToggle({ sessionId, initialReady }: ReadyToggleProps) {
  const [isReady, setIsReady] = useState(initialReady);
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const nextLabel = isReady ? 'Unready' : 'Ready up';

  function toggle() {
    const next = !isReady;
    setIsReady(next);
    setError(null);

    startTransition(async () => {
      try {
        await setReadyState({ sessionId, isReady: next });
      } catch (err) {
        setIsReady(!next);
        setError(err instanceof Error ? err.message : 'Failed to update.');
      }
    });
  }

  return (
    <div className="space-y-2">
      <button
        type="button"
        onClick={toggle}
        disabled={isPending}
        className="rounded-full border border-zinc-300 px-4 py-2 text-sm font-medium transition hover:border-zinc-900 hover:text-zinc-900 disabled:opacity-50 dark:border-zinc-700 dark:hover:border-zinc-100 dark:hover:text-white"
      >
        {isPending ? 'Updating…' : nextLabel}
      </button>
      {error ? <p className="text-xs text-red-500">{error}</p> : null}
    </div>
  );
}


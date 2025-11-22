'use client';

import { useEffect, useState } from 'react';

import { createBrowserSupabaseClient } from '@/lib/supabase';

interface GameLogProps {
  sessionId: string;
  initialEvents: GameLogEvent[];
}

interface GameLogEvent {
  id: number;
  action_type: string;
  payload: Record<string, unknown>;
  created_at: string;
}

export function GameLog({ sessionId, initialEvents }: GameLogProps) {
  const [events, setEvents] = useState(initialEvents);

  useEffect(() => {
    const supabase = createBrowserSupabaseClient();
    const channel = supabase
      .channel(`session-log-${sessionId}`)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'actions', filter: `session_id=eq.${sessionId}` },
        (payload) => {
          setEvents((prev) => [
            { ...(payload.new as GameLogEvent) },
            ...prev.slice(0, 24),
          ]);
        },
      );

    return () => {
      supabase.removeChannel(channel);
    };
  }, [sessionId]);

  if (!events.length) {
    return (
      <section className="rounded-2xl border border-zinc-200 bg-white p-6 text-sm text-zinc-500 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
        No actions logged yet.
      </section>
    );
  }

  return (
    <section className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
      <p className="text-xs uppercase tracking-[0.3em] text-zinc-500">Recent actions</p>
      <ul className="mt-4 space-y-3 text-sm">
        {events.map((event) => (
          <li key={event.id} className="text-zinc-700 dark:text-zinc-200">
            <span className="font-semibold">{event.action_type}</span>{' '}
            <span className="text-xs text-zinc-500">{new Date(event.created_at).toLocaleTimeString()}</span>
            <pre className="mt-1 rounded bg-zinc-50 p-2 text-xs text-zinc-600 dark:bg-zinc-900 dark:text-zinc-300">
              {JSON.stringify(event.payload, null, 2)}
            </pre>
          </li>
        ))}
      </ul>
    </section>
  );
}


'use client';

import { useState, useTransition } from 'react';

import { requestMagicLink } from '@/server/auth';

interface MagicLinkFormProps {
  defaultEmail?: string;
}

export function MagicLinkForm({ defaultEmail = '' }: MagicLinkFormProps) {
  const [email, setEmail] = useState(defaultEmail);
  const [status, setStatus] = useState<'idle' | 'success' | 'error'>('idle');
  const [message, setMessage] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setStatus('idle');
    setMessage(null);

    startTransition(async () => {
      try {
        await requestMagicLink(email);
        setStatus('success');
        setMessage('Magic link sent. Check your inbox.');
      } catch (error) {
        setStatus('error');
        setMessage(error instanceof Error ? error.message : 'Failed to send magic link.');
      }
    });
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300">
        Email Address
        <input
          type="email"
          value={email}
          onChange={(event) => setEmail(event.currentTarget.value)}
          placeholder="you@example.com"
          required
          className="mt-2 w-full rounded-xl border border-zinc-300 bg-white px-4 py-3 text-base text-zinc-900 shadow-sm focus:border-zinc-900 focus:outline-none dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-50"
        />
      </label>
      <button
        type="submit"
        disabled={isPending}
        className="w-full rounded-full bg-black px-5 py-3 text-sm font-semibold text-white transition hover:bg-zinc-800 disabled:opacity-60 dark:bg-zinc-50 dark:text-zinc-900 dark:hover:bg-white"
      >
        {isPending ? 'Sending…' : 'Send Magic Link'}
      </button>
      {message ? (
        <p
          className={`text-sm ${status === 'error' ? 'text-red-500' : 'text-emerald-500'}`}
        >
          {message}
        </p>
      ) : null}
    </form>
  );
}


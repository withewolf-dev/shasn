'use client';

import { useState, useTransition } from 'react';

import { upsertProfile } from '@/server/profile';

interface ProfileFormProps {
  initialDisplayName?: string;
  initialAvatarSeed?: string;
}

export function ProfileForm({
  initialDisplayName = '',
  initialAvatarSeed = '',
}: ProfileFormProps) {
  const [displayName, setDisplayName] = useState(initialDisplayName);
  const [avatarSeed, setAvatarSeed] = useState(initialAvatarSeed);
  const [message, setMessage] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage(null);

    startTransition(async () => {
      try {
        await upsertProfile({
          displayName,
          avatarSeed,
        });
        setMessage('Profile saved.');
      } catch (error) {
        setMessage(error instanceof Error ? error.message : 'Unable to save profile.');
      }
    });
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300">
        Display Name
        <input
          value={displayName}
          onChange={(event) => setDisplayName(event.currentTarget.value)}
          required
          minLength={2}
          className="mt-2 w-full rounded-xl border border-zinc-300 px-4 py-3 text-base shadow-sm focus:border-zinc-900 focus:outline-none dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-50"
        />
      </label>
      <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300">
        Avatar Seed
        <input
          value={avatarSeed}
          onChange={(event) => setAvatarSeed(event.currentTarget.value)}
          placeholder="Optional"
          className="mt-2 w-full rounded-xl border border-zinc-300 px-4 py-3 text-base shadow-sm focus:border-zinc-900 focus:outline-none dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-50"
        />
      </label>
      <button
        type="submit"
        disabled={isPending}
        className="w-full rounded-full bg-black px-5 py-3 text-sm font-semibold text-white transition hover:bg-zinc-800 disabled:opacity-60 dark:bg-zinc-50 dark:text-zinc-900 dark:hover:bg-white"
      >
        {isPending ? 'Saving…' : 'Save Profile'}
      </button>
      {message ? <p className="text-sm text-emerald-500">{message}</p> : null}
    </form>
  );
}


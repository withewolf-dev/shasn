import Link from 'next/link';

import { signOut } from '@/server/auth';

interface SiteHeaderProps {
  profileName?: string | null;
  userEmail?: string | null;
}

export function SiteHeader({ profileName, userEmail }: SiteHeaderProps) {
  const displayName = profileName ?? userEmail ?? null;

  return (
    <header className="border-b border-zinc-200 bg-white/80 backdrop-blur dark:border-zinc-800 dark:bg-zinc-900/80">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
        <nav className="flex items-center gap-4 text-sm font-medium text-zinc-600 dark:text-zinc-300">
          <Link href="/" className="text-base font-semibold text-zinc-900 dark:text-white">
            SHASN
          </Link>
          <Link className="transition hover:text-zinc-900 dark:hover:text-white" href="/lobbies">
            Lobbies
          </Link>
          <Link className="transition hover:text-zinc-900 dark:hover:text-white" href="/rules">
            Rulebook
          </Link>
        </nav>
        <div className="flex items-center gap-3 text-sm">
          {displayName ? (
            <>
              <Link
                href="/profile"
                className="rounded-full border border-zinc-200 px-3 py-1 text-zinc-700 transition hover:border-zinc-900 hover:text-zinc-900 dark:border-zinc-700 dark:text-zinc-200 dark:hover:border-zinc-300"
              >
                {displayName}
              </Link>
              <form action={signOut}>
                <button
                  type="submit"
                  className="rounded-full bg-black px-4 py-1 text-white transition hover:bg-zinc-800 dark:bg-white dark:text-zinc-900 dark:hover:bg-zinc-200"
                >
                  Sign out
                </button>
              </form>
            </>
          ) : (
            <Link
              href="/auth/login"
              className="rounded-full border border-zinc-300 px-4 py-1 text-zinc-700 transition hover:border-zinc-900 hover:text-zinc-900 dark:border-zinc-700 dark:text-zinc-200 dark:hover:border-zinc-300"
            >
              Sign in
            </Link>
          )}
        </div>
      </div>
    </header>
  );
}


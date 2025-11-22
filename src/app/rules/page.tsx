import Link from 'next/link';

import { IDEOLOGUES, RESOURCE_CAP, RESOURCE_LABELS } from '@/lib/rules';

export default function RulesPage() {
  return (
    <main className="mx-auto flex min-h-screen max-w-4xl flex-col gap-8 px-6 py-12">
      <header className="space-y-2">
        <p className="text-xs uppercase tracking-[0.3em] text-zinc-500">Canon</p>
        <h1 className="text-3xl font-semibold">SHASN Rulebook Digest</h1>
        <p className="text-sm text-zinc-600 dark:text-zinc-400">
          Full source:{' '}
          <Link
            href="https://tesera.ru/images/items/1549240/SHASN_Rulebook.pdf"
            className="font-semibold text-zinc-900 underline dark:text-white"
          >
            official PDF
          </Link>
        </p>
      </header>

      <section className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
        <h2 className="text-xl font-semibold">Resources</h2>
        <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">
          Hard cap of {RESOURCE_CAP} per player. Overflows must be discarded immediately.
        </p>
        <ul className="mt-4 grid gap-3 sm:grid-cols-2">
          {Object.entries(RESOURCE_LABELS).map(([key, label]) => (
            <li key={key} className="rounded-xl border border-zinc-100 px-4 py-3 dark:border-zinc-800">
              <p className="text-xs uppercase tracking-[0.3em] text-zinc-500">{label}</p>
              <p className="text-sm text-zinc-800 dark:text-zinc-100">Token id: {key}</p>
            </li>
          ))}
        </ul>
      </section>

      <section className="grid gap-6 md:grid-cols-2">
        {Object.values(IDEOLOGUES).map((ideologue) => (
          <article
            key={ideologue.id}
            className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm dark:border-zinc-800 dark:bg-zinc-900"
          >
            <p className="text-xs uppercase tracking-[0.3em] text-zinc-500">{ideologue.id}</p>
            <h3 className="text-2xl font-semibold">{ideologue.displayName}</h3>
            <p className="text-sm text-zinc-600 dark:text-zinc-400">{ideologue.passiveBenefit}</p>
            <ul className="mt-4 space-y-3 text-sm">
              {ideologue.powers.map((power) => (
                <li key={power.title} className="rounded-xl bg-zinc-50 p-3 dark:bg-zinc-800/60">
                  <p className="text-xs font-semibold uppercase tracking-[0.3em] text-zinc-500">
                    Level {power.level}
                  </p>
                  <p className="text-base font-semibold">{power.title}</p>
                  <p className="text-zinc-600 dark:text-zinc-300">{power.summary}</p>
                </li>
              ))}
            </ul>
          </article>
        ))}
      </section>
    </main>
  );
}


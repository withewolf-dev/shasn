import { IDEOLOGUES, RESOURCE_CAP, RESOURCE_LABELS } from "@/lib/rules";

export default function Home() {
  return (
    <main className="mx-auto flex min-h-screen max-w-5xl flex-col gap-10 bg-white px-6 py-16 font-sans text-zinc-900 dark:bg-zinc-950 dark:text-zinc-100">
      <header className="space-y-4">
        <p className="text-sm uppercase tracking-[0.3em] text-zinc-500">
          SHASN Digital Initiative
        </p>
        <h1 className="text-4xl font-semibold sm:text-5xl">
          Strategy Control Center
        </h1>
        <p className="max-w-2xl text-lg text-zinc-600 dark:text-zinc-300">
          Shared rule definitions ensure the Next.js front end and Supabase
          services speak the same language. The data below mirrors the canonical
          rulebook so designers, engineers, and AI agents stay perfectly synced.
        </p>
      </header>

      <section className="rounded-2xl border border-zinc-200 bg-zinc-50 p-6 dark:border-zinc-800 dark:bg-zinc-900">
        <h2 className="text-xl font-semibold">Resource System</h2>
        <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">
          Players cannot exceed <span className="font-semibold">{RESOURCE_CAP}</span>{' '}
          total resources. Every rule implementation pulls from this shared map.
        </p>
        <dl className="mt-4 grid gap-4 sm:grid-cols-2">
          {Object.entries(RESOURCE_LABELS).map(([key, label]) => (
            <div key={key} className="rounded-xl bg-white/70 p-4 shadow-sm dark:bg-zinc-800/60">
              <dt className="text-sm uppercase tracking-wide text-zinc-500">
                {label}
              </dt>
              <dd className="text-base text-zinc-800 dark:text-zinc-100">
                Token ID: <code className="text-sm">{key}</code>
              </dd>
            </div>
          ))}
        </dl>
      </section>

      <section className="space-y-4">
        <div>
          <h2 className="text-xl font-semibold">Ideologues</h2>
          <p className="text-sm text-zinc-600 dark:text-zinc-400">
            Level 4 &amp; 6 powers power negotiations, sabotage, and resource engines.
          </p>
        </div>
        <div className="grid gap-6 lg:grid-cols-2">
          {Object.values(IDEOLOGUES).map((ideologue) => (
            <article
              key={ideologue.id}
              className="rounded-2xl border border-zinc-200 p-6 shadow-sm dark:border-zinc-800"
            >
              <header className="space-y-1">
                <p className="text-xs uppercase tracking-[0.3em] text-zinc-500">
                  {ideologue.id}
                </p>
                <h3 className="text-2xl font-semibold">{ideologue.displayName}</h3>
                <p className="text-sm text-zinc-600 dark:text-zinc-300">
                  {ideologue.passiveBenefit}
                </p>
              </header>
              <ul className="mt-4 space-y-4 text-sm">
                {ideologue.powers.map((power) => (
                  <li key={power.title} className="rounded-xl bg-zinc-50 p-4 dark:bg-zinc-900">
                    <p className="text-xs font-semibold uppercase tracking-[0.3em] text-zinc-500">
                      Level {power.level}
                    </p>
                    <p className="text-lg font-semibold">{power.title}</p>
                    <p className="mt-1 text-zinc-700 dark:text-zinc-300">{power.summary}</p>
                    {power.constraints?.length ? (
                      <ul className="mt-2 list-disc space-y-1 pl-5 text-xs text-zinc-500 dark:text-zinc-400">
                        {power.constraints.map((constraint) => (
                          <li key={constraint}>{constraint}</li>
                        ))}
                      </ul>
                    ) : null}
                  </li>
                ))}
              </ul>
            </article>
          ))}
        </div>
      </section>
    </main>
  );
}

import type { ZoneControlRow, ZoneRow } from '@/types/database';

interface GameBoardProps {
  zoneControl: ZoneControlRow[];
  zones: ZoneRow[];
}

export function GameBoard({ zoneControl, zones }: GameBoardProps) {
  const zoneMap = new Map(zones.map((zone) => [zone.id, zone]));

  if (!zoneControl.length) {
    return (
      <section className="rounded-2xl border border-dashed border-zinc-300 p-6 text-center text-sm text-zinc-500 dark:border-zinc-700 dark:text-zinc-400">
        No voters placed yet. Use the action panel to influence your first zone.
      </section>
    );
  }

  return (
    <section className="space-y-4 rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
      <header>
        <p className="text-xs uppercase tracking-[0.3em] text-zinc-500">Battlefield</p>
        <h2 className="text-2xl font-semibold">Zone Control</h2>
      </header>
      <div className="grid gap-4 lg:grid-cols-2">
        {zoneControl.map((zone) => {
          const zoneMeta = zoneMap.get(zone.zone_id);
          const voters = zone.voter_counts ?? {};
          return (
            <article key={zone.zone_id} className="rounded-xl border border-zinc-200 p-4 dark:border-zinc-800">
              <p className="text-xs uppercase tracking-[0.3em] text-zinc-500">
                {zoneMeta?.display_name ?? zone.zone_id}
              </p>
              <p className="text-xs text-zinc-500">
                Needs {zoneMeta?.majority_required ?? '?'} voters for majority
              </p>
              <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
                Majority owner: {zone.majority_owner ?? 'Unclaimed'}
              </p>
              <ul className="mt-3 space-y-1 text-sm">
                {Object.entries(voters).map(([playerId, count]) => (
                  <li key={playerId} className="flex items-center justify-between text-zinc-800 dark:text-zinc-200">
                    <span>{playerId.slice(0, 6)}…</span>
                    <span>{count}</span>
                  </li>
                ))}
              </ul>
            </article>
          );
        })}
      </div>
    </section>
  );
}


import { useMemo } from 'react';
import { CHARGERS, siteById, type Charger } from '../data/network';
import { TAXONOMY, type ComponentId } from '../data/taxonomy';
import type { Report } from '../data/types';
import { componentCounts, fmtRate, pct, ratePer100, sessionsFor, type Filters } from './analytics';

export function Portfolio({ reports, filters, onOpen }: { reports: Report[]; filters: Filters; onOpen: (c: Charger) => void }) {
  const rows = useMemo(
    () =>
      CHARGERS.map((c) => {
        const items = reports.filter((r) => r.chargerId === c.id);
        const counts = componentCounts(items);
        const top = (Object.entries(counts) as [ComponentId, number][]).sort((a, b) => b[1] - a[1])[0];
        const abandoned = items.filter((r) => r.outcome === 'abandoned').length;
        return {
          c,
          total: items.length,
          top: top && top[1] > 0 ? top : null,
          abandonedPct: pct(abandoned, items.length),
          rate: ratePer100(items.length, sessionsFor([c.id], filters.from, filters.to)),
        };
      }).sort((a, b) => b.rate - a.rate),
    [reports, filters.from, filters.to],
  );

  return (
    <div className="overflow-x-auto rounded-2xl border border-ink/15 bg-paper/50">
      <table className="w-full min-w-[720px] text-left text-sm">
        <caption className="p-3 text-left text-ink-soft">
          All {CHARGERS.length} chargers, ranked by reports per 100 sessions. Choose a charger to open it on the model.
        </caption>
        <thead className="bg-cream-deep">
          <tr>
            <th scope="col" className="p-3">Charger</th>
            <th scope="col" className="p-3">Site</th>
            <th scope="col" className="p-3">Generation</th>
            <th scope="col" className="p-3">Top part</th>
            <th scope="col" className="p-3 text-right">Reports</th>
            <th scope="col" className="p-3 text-right">Per 100 sessions</th>
            <th scope="col" className="p-3 text-right">Left without charging</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r.c.id} className="border-t border-ink/10 hover:bg-dandelion/40">
              <th scope="row" className="p-0">
                <button type="button" onClick={() => onOpen(r.c)} className="min-h-12 w-full px-3 text-left font-semibold underline underline-offset-4">
                  {r.c.name} <span className="font-normal text-ink-soft">({r.c.assetId})</span>
                </button>
              </th>
              <td className="p-3">{siteById(r.c.siteId).name}</td>
              <td className="p-3">{r.c.generation}</td>
              <td className="p-3">{r.top ? `${TAXONOMY[r.top[0]].label} (${r.top[1]})` : 'None'}</td>
              <td className="p-3 text-right tabular-nums">{r.total}</td>
              <td className="p-3 text-right tabular-nums">{fmtRate(r.rate)}</td>
              <td className="p-3 text-right tabular-nums">{r.abandonedPct}%</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

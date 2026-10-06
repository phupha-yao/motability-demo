import { INTERVENTIONS, siteById } from '../data/network';
import type { Report } from '../data/types';
import { monthlySeries, type Filters } from './analytics';

export function TrendStrip({ reports, filters, title }: { reports: Report[]; filters: Filters; title: string }) {
  const series = monthlySeries(reports, filters.from, filters.to);
  const max = Math.max(1, ...series.map((s) => s.count));
  const markers = INTERVENTIONS.filter(
    (iv) =>
      (filters.siteId === iv.siteId || (filters.chargerId && iv.chargerIds.includes(filters.chargerId))) &&
      series.some((s) => s.key === iv.date.slice(0, 7)),
  );
  return (
    <figure className="flex h-full flex-col">
      <figcaption className="flex items-baseline justify-between text-sm">
        <span className="font-semibold">{title}</span>
        <span className="text-ink-soft">Reports per month</span>
      </figcaption>
      <ol className="mt-2 flex flex-1 items-end gap-1.5" aria-label="Reports per month">
        {series.map((s) => {
          const marker = markers.find((m) => m.date.slice(0, 7) === s.key);
          return (
            <li key={s.key} className="relative flex h-full flex-1 flex-col items-center justify-end">
              {marker && (
                <span className="absolute inset-y-0 left-1/2 border-l-2 border-dashed border-ink" aria-hidden="true">
                  <span className="absolute -top-0.5 left-1 whitespace-nowrap rounded bg-ink px-1 text-[10px] text-cream">
                    Fix fitted
                  </span>
                </span>
              )}
              <span className="text-[11px] tabular-nums">{s.count}</span>
              <span className="w-full rounded-t-md bg-orange" style={{ height: `${(s.count / max) * 70}%`, minHeight: s.count ? 3 : 0 }} aria-hidden="true" />
              <span className="mt-0.5 text-[11px] text-ink-soft">{s.label}</span>
              <span className="sr-only">
                {s.label}: {s.count} reports{marker ? `. ${marker.description} at ${siteById(marker.siteId).name}` : ''}
              </span>
            </li>
          );
        })}
      </ol>
    </figure>
  );
}

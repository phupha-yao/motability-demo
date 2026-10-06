import { useMemo, type ReactNode } from 'react';
import { GROUPS, IMPACTS, OUTCOMES } from '../data/impacts';
import { chargerById, siteById } from '../data/network';
import { TAXONOMY, type ComponentId } from '../data/taxonomy';
import type { Generation, Report } from '../data/types';
import { HeatBadge } from '../components/HeatBadge';
import {
  applyFilters,
  chargersInScope,
  componentCounts,
  countBy,
  fmtRate,
  heatLevel,
  monthlySeries,
  pct,
  ratePer100,
  sessionsFor,
  type Filters,
} from './analytics';
import { EvidenceGallery } from './EvidenceGallery';

export function Sparkline({ values, label }: { values: number[]; label: string }) {
  const max = Math.max(1, ...values);
  const w = 120;
  const h = 32;
  const pts = values.map((v, i) => `${(i / Math.max(1, values.length - 1)) * w},${h - (v / max) * (h - 4) - 2}`).join(' ');
  return (
    <svg viewBox={`0 0 ${w} ${h}`} className="h-8 w-28" role="img" aria-label={label}>
      <polyline points={pts} fill="none" stroke="#1f1f1f" strokeWidth={2} strokeLinejoin="round" />
      {values.length > 0 && (
        <circle cx={w} cy={h - (values[values.length - 1] / max) * (h - 4) - 2} r={3} fill="#ff7199" stroke="#1f1f1f" />
      )}
    </svg>
  );
}

function Bars({ rows, total }: { rows: { label: string; n: number }[]; total: number }) {
  const max = Math.max(1, ...rows.map((r) => r.n));
  return (
    <ul className="space-y-1.5">
      {rows.map((r) => (
        <li key={r.label} className="text-sm">
          <div className="flex justify-between gap-2">
            <span>{r.label}</span>
            <span className="tabular-nums text-ink-soft">
              {r.n} ({pct(r.n, total)}%)
            </span>
          </div>
          <div className="mt-0.5 h-2.5 rounded-full bg-ink/10" aria-hidden="true">
            <div className="h-full rounded-full bg-orange" style={{ width: `${(r.n / max) * 100}%` }} />
          </div>
        </li>
      ))}
    </ul>
  );
}

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="border-t border-ink/10 py-4">
      <h3 className="mb-2 text-base">{title}</h3>
      {children}
    </section>
  );
}

const MIN_GROUP = 5;

export function DetailPanel({
  component,
  scoped,
  allReports,
  filters,
  generation,
  highlightId,
  onClose,
}: {
  component: ComponentId | null;
  scoped: Report[];
  allReports: Report[];
  filters: Filters;
  generation: Generation;
  highlightId?: string | null;
  onClose: () => void;
}) {
  const counts = useMemo(() => componentCounts(scoped), [scoped]);
  const max = Math.max(0, ...Object.values(counts));

  if (!component) {
    const ranked = (Object.entries(counts) as [ComponentId, number][]).filter(([, n]) => n > 0).sort((a, b) => b[1] - a[1]);
    return (
      <div>
        <h2 className="text-xl">Where drivers had difficulty</h2>
        <p className="mt-1 text-sm text-ink-soft">
          {scoped.length} reports on {generation} chargers for this selection. Choose a part to see the detail.
        </p>
        <ol className="mt-4 space-y-1.5">
          {ranked.slice(0, 6).map(([id, n], i) => (
            <li key={id} className="flex items-center justify-between gap-2 text-sm">
              <span>
                {i + 1}. {TAXONOMY[id].label}
              </span>
              <HeatBadge count={n} level={heatLevel(n, max)} />
            </li>
          ))}
        </ol>
        {!ranked.length && <p className="mt-4 text-sm">No reports match these filters.</p>}
      </div>
    );
  }

  const info = TAXONOMY[component];
  const items = scoped.filter((r) => r.componentId === component);
  const total = items.length;
  const series = monthlySeries(items, filters.from, filters.to);
  const impacts = countBy(items, (r) => r.impacts);
  const outcomes = countBy(items, (r) => r.outcome);
  const groups = countBy(items, (r) => r.selfDescribedGroups);

  // Where: rank chargers by rate per 100 sessions.
  const byCharger = countBy(items, (r) => r.chargerId);
  const where = [...byCharger.entries()]
    .map(([id, n]) => ({ id, n, rate: ratePer100(n, sessionsFor([id], filters.from, filters.to)) }))
    .sort((a, b) => b.rate - a.rate)
    .slice(0, 5);

  // By generation: same filters except generation and charger.
  const crossGen = applyFilters(allReports, { ...filters, generation: null, chargerId: null }).filter((r) => r.componentId === component);
  const genRows = (['Gen 1', 'Gen 2'] as Generation[]).map((g) => {
    const n = crossGen.filter((r) => r.generation === g).length;
    const ids = chargersInScope({ ...filters, chargerId: null }, g).map((c) => c.id);
    return { g, n, rate: ratePer100(n, sessionsFor(ids, filters.from, filters.to)) };
  });

  return (
    <div>
      <div className="flex items-start justify-between gap-2">
        <div>
          <p className="text-sm text-ink-soft">Selected part · {generation}</p>
          <h2 className="text-2xl">{info.label}</h2>
        </div>
        <button type="button" onClick={onClose} className="min-h-10 rounded-full border border-ink/30 px-3 text-sm">
          Back to overview
        </button>
      </div>

      <div className="mt-3 flex items-center gap-4">
        <div>
          <p className="font-heading text-4xl tabular-nums">{total}</p>
          <p className="text-sm text-ink-soft">reports</p>
        </div>
        <HeatBadge count={total} level={heatLevel(total, max)} />
        <div className="ml-auto text-right">
          <Sparkline values={series.map((s) => s.count)} label={`Monthly reports: ${series.map((s) => `${s.label} ${s.count}`).join(', ')}`} />
          <p className="text-xs text-ink-soft">per month</p>
        </div>
      </div>

      <p className="mt-3 rounded-xl bg-sky/40 p-3 text-sm">
        <span className="font-semibold">Suggested PAS 1899 area to check.</span> Reports relate to:{' '}
        {info.pas1899Area.map((a) => a.toLowerCase()).join(' and ')}.
      </p>

      {total === 0 ? (
        <p className="mt-4 text-sm">No reports for this part with these filters.</p>
      ) : (
        <>
          <Section title="What happened">
            <Bars
              total={total}
              rows={IMPACTS.map((i) => ({ label: i.label, n: impacts.get(i.id) ?? 0 }))
                .filter((r) => r.n > 0)
                .sort((a, b) => b.n - a.n)}
            />
          </Section>

          <Section title="Did they finish charging?">
            <dl className="grid grid-cols-3 gap-2 text-center">
              {OUTCOMES.map((o) => (
                <div key={o.id} className={`rounded-xl p-2 ${o.id === 'abandoned' ? 'bg-bubblegum' : o.id === 'completed_with_help' ? 'bg-dandelion' : 'bg-mint'}`}>
                  <dt className="text-xs">{o.long}</dt>
                  <dd className="font-heading text-xl tabular-nums">{outcomes.get(o.id) ?? 0}</dd>
                  <dd className="text-xs">{pct(outcomes.get(o.id) ?? 0, total)}%</dd>
                </div>
              ))}
            </dl>
          </Section>

          <Section title="Patterns across groups">
            <p className="mb-2 text-xs text-ink-soft">Optional and self-described. Only shown where at least {MIN_GROUP} reports share a group.</p>
            {[...groups.values()].some((n) => n >= MIN_GROUP) ? (
              <Bars
                total={total}
                rows={GROUPS.map((g) => ({ label: g.short, n: groups.get(g.id) ?? 0 }))
                  .filter((r) => r.n >= MIN_GROUP)
                  .sort((a, b) => b.n - a.n)}
              />
            ) : (
              <p className="text-sm">Not enough reports to show.</p>
            )}
          </Section>

          <Section title="Where">
            <ol className="space-y-1 text-sm">
              {where.map((w) => {
                const ch = chargerById(w.id)!;
                return (
                  <li key={w.id} className="flex justify-between gap-2">
                    <span>
                      {ch.name}, {siteById(ch.siteId).area}
                    </span>
                    <span className="tabular-nums text-ink-soft">
                      {fmtRate(w.rate)} per 100 sessions ({w.n})
                    </span>
                  </li>
                );
              })}
            </ol>
          </Section>

          <Section title="By generation">
            <div className="grid grid-cols-2 gap-2">
              {genRows.map((r) => (
                <div key={r.g} className={`rounded-xl border-2 p-3 ${r.g === generation ? 'border-ink' : 'border-ink/15'}`}>
                  <p className="text-sm">{r.g}</p>
                  <p className="font-heading text-2xl tabular-nums">{fmtRate(r.rate)}</p>
                  <p className="text-xs text-ink-soft">per 100 sessions · {r.n} reports</p>
                </div>
              ))}
            </div>
          </Section>

          <Section title="Evidence from drivers">
            <EvidenceGallery reports={items} highlightId={highlightId} />
          </Section>
        </>
      )}
    </div>
  );
}

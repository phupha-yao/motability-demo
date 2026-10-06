import { useId, useMemo, useState, type ReactNode } from 'react';
import { GROUPS, IMPACTS, OUTCOMES, groupLabel, impactLabel, outcomeLabel } from '../data/impacts';
import { CHARGERS, DATA_START, SITES, chargerById, siteById } from '../data/network';
import { ENTRY_LABELS, type EntryPoint, type Generation, type Report } from '../data/types';
import { DEFAULT_FILTERS, LATEST_DATE, applyFilters, countBy, type Filters } from './analytics';

// Filter rail patterns: active filters as removable chips, a count beside every option so
// nobody picks a dead end, small option sets shown directly, niche filters tucked away.

const CONDITIONS: { id: Filters['conditions']; label: string }[] = [
  { id: 'any', label: 'Any' },
  { id: 'wet', label: 'Wet' },
  { id: 'dark', label: 'Dark' },
  { id: 'wet_or_dark', label: 'Wet or dark' },
];

const OUTCOME_SHORT = { completed: 'Yes', completed_with_help: 'With help', abandoned: 'No, left' } as const;

const monthsBefore = (iso: string, n: number) => {
  const d = new Date(iso);
  d.setMonth(d.getMonth() - n);
  return d.toISOString().slice(0, 10);
};
const PRESETS = [
  { id: 'all', label: 'All', from: DATA_START },
  { id: '6m', label: 'Last 6 months', from: monthsBefore(LATEST_DATE, 6) },
  { id: '3m', label: 'Last 3 months', from: monthsBefore(LATEST_DATE, 3) },
] as const;

const fmtDate = (iso: string) => new Date(iso).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });
const field = 'min-h-10 w-full rounded-lg border border-ink/30 bg-paper px-2 text-sm';

function Section({ title, children }: { title: string; children: ReactNode }) {
  const id = useId();
  return (
    <section role="group" aria-labelledby={id} className="border-t border-ink/10 pt-3">
      <h3 id={id} className="pb-2 text-[15px]">
        {title}
      </h3>
      {children}
    </section>
  );
}

/** Pill-style radio group for small sets of options. */
function Pills<T extends string | null>({
  label,
  options,
  value,
  onSelect,
  defaultId,
}: {
  label: string;
  options: { id: T; label: string; count?: number }[];
  value: T;
  onSelect: (v: T) => void;
  /** The "no filter" option: shown selected but quiet, so only real filters stand out. */
  defaultId: T;
}) {
  return (
    <div role="radiogroup" aria-label={label} className="flex flex-wrap gap-1.5">
      {options.map((o) => {
        const on = o.id === value;
        const active = on && o.id !== defaultId;
        const empty = o.count === 0 && !on;
        return (
          <button
            key={String(o.id)}
            type="button"
            role="radio"
            aria-checked={on}
            disabled={empty}
            onClick={() => onSelect(o.id)}
            className={`flex min-h-9 items-center gap-1.5 rounded-full border px-3 text-[13px] ${
              active ? 'border-ink bg-ink text-cream' : on ? 'border-ink bg-paper font-semibold' : 'border-ink/25 bg-paper hover:border-ink'
            } disabled:cursor-not-allowed disabled:border-dashed disabled:opacity-45`}
          >
            {active && <span aria-hidden="true">✓</span>}
            {o.label}
            {o.count !== undefined && (
              <span className={`tabular-nums ${active ? 'text-cream/75' : 'text-ink-soft'}`}>
                <span className="sr-only">, </span>
                {o.count}
                <span className="sr-only"> reports</span>
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}

/** Single-choice list with a count and a proportion bar for each option. */
function FacetList<T extends string>({
  name,
  options,
  value,
  onSelect,
  anyLabel,
  total,
}: {
  name: string;
  options: { id: T; label: string; count: number }[];
  value: T | null;
  onSelect: (v: T | null) => void;
  anyLabel: string;
  total: number;
}) {
  const max = Math.max(1, ...options.map((o) => o.count));
  const row = (id: T | null, label: string, count: number, bar: number | null) => {
    const on = id === value;
    const empty = count === 0 && !on;
    return (
      <li key={id ?? 'any'}>
        <label
          className={`relative flex min-h-9 cursor-pointer items-center gap-2 rounded-lg px-2 py-1 ${on && id !== null ? 'bg-dandelion' : 'hover:bg-ink/5'} ${
            empty ? 'cursor-not-allowed opacity-45' : ''
          }`}
        >
          <input type="radio" name={name} checked={on} disabled={empty} onChange={() => onSelect(id)} className="h-4 w-4 shrink-0 accent-ink" />
          <span className="min-w-0 flex-1">
            <span className="block truncate text-[13px]">{label}</span>
            {bar !== null && (
              <span aria-hidden="true" className="mt-0.5 block h-1 rounded-full bg-ink/10">
                <span className="block h-full rounded-full bg-orange" style={{ width: `${(bar / max) * 100}%` }} />
              </span>
            )}
          </span>
          <span className="text-xs tabular-nums text-ink-soft">
            {count}
            <span className="sr-only"> reports</span>
          </span>
        </label>
      </li>
    );
  };
  return (
    <ul className="space-y-0.5">
      {row(null, anyLabel, total, null)}
      {options.map((o) => row(o.id, o.label, o.count, o.count))}
    </ul>
  );
}

export function FilterRail({
  filters,
  onChange,
  reports,
  generation,
}: {
  filters: Filters;
  onChange: (f: Filters) => void;
  reports: Report[];
  generation: Generation;
}) {
  const set = <K extends keyof Filters>(k: K, v: Filters[K]) => onChange({ ...filters, [k]: v });
  const ids = useId();

  // Facet counts: for each filter, count what you would get by changing only that filter.
  const facet = useMemo(() => {
    const base = (patch: Partial<Filters>) => applyFilters(reports, { ...filters, ...patch }).filter((r) => r.generation === generation);
    return {
      total: base({}).length,
      impact: countBy(base({ impact: null }), (r) => r.impacts),
      outcome: countBy(base({ outcome: null }), (r) => r.outcome),
      conditions: base({ conditions: 'any' }),
      group: countBy(base({ group: null }), (r) => r.selfDescribedGroups),
      entry: countBy(base({ entryPoint: null }), (r) => r.entryPoint),
      site: countBy(base({ siteId: null, chargerId: null }), (r) => r.siteId),
      charger: countBy(base({ chargerId: null }), (r) => r.chargerId),
      outcomeTotal: base({ outcome: null }).length,
      impactTotal: base({ impact: null }).length,
      conditionsTotal: base({ conditions: 'any' }).length,
    };
  }, [reports, filters, generation]);

  const conditionCount = (c: Filters['conditions']) =>
    c === 'any'
      ? facet.conditionsTotal
      : facet.conditions.filter((r) => (c === 'wet_or_dark' ? r.weather === 'wet' || r.weather === 'dark' : r.weather === c)).length;

  const preset = PRESETS.find((p) => p.from === filters.from && filters.to === LATEST_DATE)?.id ?? 'custom';
  const [customOpen, setCustomOpen] = useState(preset === 'custom');
  const showCustom = customOpen || preset === 'custom';

  // Active filters, each removable on its own.
  const chips: { key: string; label: string; clear: Partial<Filters> }[] = [];
  if (preset !== 'all') chips.push({ key: 'date', label: `${fmtDate(filters.from)} to ${fmtDate(filters.to)}`, clear: { from: DATA_START, to: LATEST_DATE } });
  if (filters.siteId) chips.push({ key: 'site', label: siteById(filters.siteId).area, clear: { siteId: null, chargerId: null } });
  if (filters.chargerId) chips.push({ key: 'charger', label: chargerById(filters.chargerId)!.name, clear: { chargerId: null } });
  if (filters.impact) chips.push({ key: 'impact', label: impactLabel(filters.impact), clear: { impact: null } });
  if (filters.outcome) chips.push({ key: 'outcome', label: outcomeLabel(filters.outcome), clear: { outcome: null } });
  if (filters.conditions !== 'any')
    chips.push({ key: 'cond', label: CONDITIONS.find((c) => c.id === filters.conditions)!.label, clear: { conditions: 'any' } });
  if (filters.group) chips.push({ key: 'group', label: groupLabel(filters.group), clear: { group: null } });
  if (filters.entryPoint) chips.push({ key: 'entry', label: ENTRY_LABELS[filters.entryPoint], clear: { entryPoint: null } });

  const moreActive = !!(filters.group || filters.entryPoint);
  const chargers = CHARGERS.filter((c) => (!filters.siteId || c.siteId === filters.siteId) && c.generation === generation);

  return (
    <form aria-label="Filters" className="space-y-3 text-sm" onSubmit={(e) => e.preventDefault()}>
      <div>
        <div className="flex items-baseline justify-between gap-2">
          <h2 className="flex items-center gap-2 text-lg">
            Filters
            {chips.length > 0 && (
              <span className="rounded-full bg-ink px-2 text-xs leading-5 text-cream">
                {chips.length}
                <span className="sr-only"> active</span>
              </span>
            )}
          </h2>
          {chips.length > 0 && (
            <button
              type="button"
              className="min-h-9 text-[13px] underline underline-offset-4"
              onClick={() => {
                setCustomOpen(false);
                onChange({ ...DEFAULT_FILTERS, generation: filters.generation });
              }}
            >
              Clear all
            </button>
          )}
        </div>
        <p role="status" className="mt-1 text-[13px] text-ink-soft">
          <strong className="font-heading text-base text-ink tabular-nums">{facet.total}</strong> {generation} reports match
        </p>
        {chips.length > 0 && (
          <ul className="mt-2 flex flex-wrap gap-1.5" aria-label="Active filters">
            {chips.map((c) => (
              <li key={c.key}>
                <button
                  type="button"
                  onClick={() => {
                    if (c.key === 'date') setCustomOpen(false);
                    onChange({ ...filters, ...c.clear });
                  }}
                  className="flex min-h-8 max-w-full items-center gap-1 rounded-full bg-dandelion py-0.5 pl-2.5 pr-1.5 text-xs hover:bg-orange"
                  aria-label={`Remove filter: ${c.label}`}
                >
                  <span className="truncate">{c.label}</span>
                  <span aria-hidden="true" className="flex h-5 w-5 items-center justify-center rounded-full bg-ink/10">
                    ✕
                  </span>
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>

      <Section title="When">
        <Pills
          label="Date range"
          defaultId="all"
          value={showCustom ? 'custom' : preset}
          onSelect={(id) => {
            if (id === 'custom') return setCustomOpen(true);
            setCustomOpen(false);
            const p = PRESETS.find((x) => x.id === id)!;
            onChange({ ...filters, from: p.from, to: LATEST_DATE });
          }}
          options={[...PRESETS.map((p) => ({ id: p.id as string, label: p.label })), { id: 'custom', label: 'Custom' }]}
        />
        {showCustom && (
          <div className="mt-2 grid grid-cols-[auto_1fr] items-center gap-x-2 gap-y-1.5">
            <label htmlFor={`${ids}-from`} className="text-[13px] text-ink-soft">
              From
            </label>
            <input
              id={`${ids}-from`}
              type="date"
              className={field}
              min={DATA_START}
              max={filters.to}
              value={filters.from}
              onChange={(e) => set('from', e.target.value || DATA_START)}
            />
            <label htmlFor={`${ids}-to`} className="text-[13px] text-ink-soft">
              To
            </label>
            <input
              id={`${ids}-to`}
              type="date"
              className={field}
              min={filters.from}
              max={LATEST_DATE}
              value={filters.to}
              onChange={(e) => set('to', e.target.value || LATEST_DATE)}
            />
          </div>
        )}
      </Section>

      <Section title="Where">
        <label className="block text-[13px] text-ink-soft" htmlFor={`${ids}-site`}>
          Site
        </label>
        <select
          id={`${ids}-site`}
          className={`${field} mt-1`}
          value={filters.siteId ?? ''}
          onChange={(e) => onChange({ ...filters, siteId: e.target.value || null, chargerId: null })}
        >
          <option value="">All sites</option>
          {SITES.map((s) => (
            <option key={s.id} value={s.id}>
              {s.name} ({facet.site.get(s.id) ?? 0})
            </option>
          ))}
        </select>
        <label className="mt-2 block text-[13px] text-ink-soft" htmlFor={`${ids}-charger`}>
          Charger ({generation})
        </label>
        <select
          id={`${ids}-charger`}
          className={`${field} mt-1`}
          value={filters.chargerId ?? ''}
          onChange={(e) => {
            const ch = chargerById(e.target.value);
            onChange({ ...filters, chargerId: ch?.id ?? null, siteId: ch?.siteId ?? filters.siteId });
          }}
        >
          <option value="">All {generation} chargers</option>
          {chargers.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}, {siteById(c.siteId).area} ({facet.charger.get(c.id) ?? 0})
            </option>
          ))}
        </select>
      </Section>

      <Section title="What happened">
        <FacetList
          name={`${ids}-impact`}
          anyLabel="Anything"
          total={facet.impactTotal}
          value={filters.impact}
          onSelect={(v) => set('impact', v)}
          options={IMPACTS.map((i) => ({ id: i.id, label: i.label, count: facet.impact.get(i.id) ?? 0 }))}
        />
      </Section>

      <Section title="Did they finish charging?">
        <Pills
          label="Outcome"
          defaultId={null}
          value={filters.outcome}
          onSelect={(v) => set('outcome', v)}
          options={[
            { id: null, label: 'Any', count: facet.outcomeTotal },
            ...OUTCOMES.map((o) => ({ id: o.id, label: OUTCOME_SHORT[o.id], count: facet.outcome.get(o.id) ?? 0 })),
          ]}
        />
      </Section>

      <Section title="Conditions">
        <Pills
          label="Conditions"
          defaultId="any"
          value={filters.conditions}
          onSelect={(v) => set('conditions', v)}
          options={CONDITIONS.map((c) => ({ id: c.id, label: c.label, count: conditionCount(c.id) }))}
        />
      </Section>

      <details className="border-t border-ink/10 pt-3" open={moreActive || undefined}>
        <summary className="flex min-h-9 cursor-pointer items-center justify-between font-heading text-[15px]">
          More filters
          {moreActive && <span className="font-body text-xs font-normal text-ink-soft">In use</span>}
        </summary>
        <div className="mt-2 space-y-2">
          <label className="block text-[13px] text-ink-soft" htmlFor={`${ids}-group`}>
            Group (self-described, optional)
          </label>
          <select
            id={`${ids}-group`}
            className={field}
            value={filters.group ?? ''}
            onChange={(e) => set('group', (e.target.value || null) as Filters['group'])}
          >
            <option value="">Everyone</option>
            {GROUPS.map((g) => (
              <option key={g.id} value={g.id}>
                {g.short} ({facet.group.get(g.id) ?? 0})
              </option>
            ))}
          </select>
          <label className="block text-[13px] text-ink-soft" htmlFor={`${ids}-entry`}>
            Where the report came from
          </label>
          <select
            id={`${ids}-entry`}
            className={field}
            value={filters.entryPoint ?? ''}
            onChange={(e) => set('entryPoint', (e.target.value || null) as EntryPoint | null)}
          >
            <option value="">Anywhere</option>
            {(Object.keys(ENTRY_LABELS) as EntryPoint[]).map((k) => (
              <option key={k} value={k}>
                {ENTRY_LABELS[k]} ({facet.entry.get(k) ?? 0})
              </option>
            ))}
          </select>
        </div>
      </details>
    </form>
  );
}

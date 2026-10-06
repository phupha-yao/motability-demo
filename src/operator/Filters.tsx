import { GROUPS, IMPACTS, OUTCOMES } from '../data/impacts';
import { CHARGERS, DATA_START, SITES, chargerById } from '../data/network';
import { ENTRY_LABELS, type EntryPoint, type Generation } from '../data/types';
import { DEFAULT_FILTERS, LATEST_DATE, type Filters } from './analytics';

const field = 'mt-1 min-h-10 w-full rounded-lg border border-ink/30 bg-paper px-2 text-sm';

export function FilterRail({ filters, onChange, count }: { filters: Filters; onChange: (f: Filters) => void; count: number }) {
  const set = <K extends keyof Filters>(k: K, v: Filters[K]) => onChange({ ...filters, [k]: v });
  const sel = (v: string) => (v === '' ? null : v);
  const chargers = CHARGERS.filter((c) => !filters.siteId || c.siteId === filters.siteId);

  return (
    <form aria-label="Filters" className="space-y-3 text-sm" onSubmit={(e) => e.preventDefault()}>
      <div className="flex items-baseline justify-between">
        <h2 className="text-lg">Filters</h2>
        <button type="button" className="min-h-10 underline underline-offset-4" onClick={() => onChange(DEFAULT_FILTERS)}>
          Clear all
        </button>
      </div>
      <p role="status" className="text-ink-soft">
        {count} report{count === 1 ? '' : 's'} match
      </p>
      <fieldset className="grid gap-2">
        <legend className="mb-1 font-semibold">Date range</legend>
        <label>
          From
          <input type="date" className={field} min={DATA_START} max={filters.to} value={filters.from} onChange={(e) => set('from', e.target.value || DATA_START)} />
        </label>
        <label>
          To
          <input type="date" className={field} min={filters.from} max={LATEST_DATE} value={filters.to} onChange={(e) => set('to', e.target.value || LATEST_DATE)} />
        </label>
      </fieldset>
      <label className="block font-semibold">
        Site
        <select
          className={field}
          value={filters.siteId ?? ''}
          onChange={(e) => onChange({ ...filters, siteId: sel(e.target.value), chargerId: null })}
        >
          <option value="">All sites</option>
          {SITES.map((s) => (
            <option key={s.id} value={s.id}>
              {s.name}
            </option>
          ))}
        </select>
      </label>
      <label className="block font-semibold">
        Charger
        <select
          className={field}
          value={filters.chargerId ?? ''}
          onChange={(e) => {
            const ch = chargerById(e.target.value);
            onChange({ ...filters, chargerId: ch?.id ?? null, siteId: ch?.siteId ?? filters.siteId, generation: ch?.generation ?? filters.generation });
          }}
        >
          <option value="">All chargers</option>
          {chargers.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}, {SITES.find((s) => s.id === c.siteId)!.area} ({c.generation})
            </option>
          ))}
        </select>
      </label>
      <label className="block font-semibold">
        Generation
        <select
          className={field}
          value={filters.generation ?? ''}
          onChange={(e) => onChange({ ...filters, generation: sel(e.target.value) as Generation | null, chargerId: null })}
        >
          <option value="">Both (model shows Gen 1)</option>
          <option value="Gen 1">Gen 1</option>
          <option value="Gen 2">Gen 2</option>
        </select>
      </label>
      <label className="block font-semibold">
        What happened
        <select className={field} value={filters.impact ?? ''} onChange={(e) => set('impact', sel(e.target.value) as Filters['impact'])}>
          <option value="">Anything</option>
          {IMPACTS.map((i) => (
            <option key={i.id} value={i.id}>
              {i.label}
            </option>
          ))}
        </select>
      </label>
      <label className="block font-semibold">
        Outcome
        <select className={field} value={filters.outcome ?? ''} onChange={(e) => set('outcome', sel(e.target.value) as Filters['outcome'])}>
          <option value="">Any outcome</option>
          {OUTCOMES.map((o) => (
            <option key={o.id} value={o.id}>
              {o.long}
            </option>
          ))}
        </select>
      </label>
      <label className="block font-semibold">
        Group (self-described)
        <select className={field} value={filters.group ?? ''} onChange={(e) => set('group', sel(e.target.value) as Filters['group'])}>
          <option value="">Everyone</option>
          {GROUPS.map((g) => (
            <option key={g.id} value={g.id}>
              {g.short}
            </option>
          ))}
        </select>
      </label>
      <label className="block font-semibold">
        Conditions
        <select className={field} value={filters.conditions} onChange={(e) => set('conditions', e.target.value as Filters['conditions'])}>
          <option value="any">Any</option>
          <option value="wet">Wet</option>
          <option value="dark">Dark</option>
          <option value="wet_or_dark">Wet or dark</option>
        </select>
      </label>
      <label className="block font-semibold">
        Entry point
        <select className={field} value={filters.entryPoint ?? ''} onChange={(e) => set('entryPoint', sel(e.target.value) as EntryPoint | null)}>
          <option value="">Any</option>
          {(Object.keys(ENTRY_LABELS) as EntryPoint[]).map((k) => (
            <option key={k} value={k}>
              {ENTRY_LABELS[k]}
            </option>
          ))}
        </select>
      </label>
    </form>
  );
}

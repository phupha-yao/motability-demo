import { useEffect, useMemo, useRef, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { CicelyWordmark } from '../components/Brand';
import { INTERVENTIONS, OPERATOR, chargerById, siteById, type Charger } from '../data/network';
import { COMPONENT_IDS, TAXONOMY, type ComponentId } from '../data/taxonomy';
import type { Generation } from '../data/types';
import { useAllReports, useReportStore } from '../store/reports';
import { DEFAULT_FILTERS, HEAT_LABELS, applyFilters, componentCounts, heatLevel, type Filters } from './analytics';
import { BeforeAfter } from './BeforeAfter';
import type { HeatCell, ModelVariant } from './ChargerModel';
import { DetailPanel } from './DetailPanel';
import { FilterRail } from './Filters';
import { Portfolio } from './Portfolio';
import type { CameraPreset } from './Scene';
import { TrendStrip } from './TrendStrip';
import { Viewport } from './Viewport';

type Tab = 'charger' | 'portfolio' | 'beforeafter';
const TABS: { id: Tab; label: string }[] = [
  { id: 'charger', label: 'Charger view' },
  { id: 'portfolio', label: 'All chargers' },
  { id: 'beforeafter', label: 'Before and after' },
];

export default function OperatorView({ embedded = false, highlightId: highlightProp = null }: { embedded?: boolean; highlightId?: string | null }) {
  const reports = useAllReports();
  const liveCount = useReportStore((s) => s.liveReports.length);
  const [params] = useSearchParams();
  const [tab, setTab] = useState<Tab>('charger');
  const [filters, setFilters] = useState<Filters>(DEFAULT_FILTERS);
  const [selected, setSelected] = useState<ComponentId | null>(null);
  const [hovered, setHovered] = useState<ComponentId | null>(null);
  const [use2D, setUse2D] = useState(false);
  const [preset, setPreset] = useState<CameraPreset>('front');
  const [highlightId, setHighlightId] = useState<string | null>(highlightProp ?? params.get('highlight'));
  const [announcement, setAnnouncement] = useState('');

  // A new report arriving (from the side-by-side phone or another tab) becomes the highlight.
  const prevLive = useRef(liveCount);
  useEffect(() => {
    if (liveCount > prevLive.current) {
      const newest = useReportStore.getState().liveReports.at(-1);
      if (newest) setHighlightId(newest.id);
    }
    prevLive.current = liveCount;
  }, [liveCount]);
  useEffect(() => {
    if (highlightProp) setHighlightId(highlightProp);
  }, [highlightProp]);

  const highlight = useMemo(() => reports.find((r) => r.id === highlightId) ?? null, [reports, highlightId]);
  useEffect(() => {
    if (!highlight) return;
    // Show the new report in context: its generation, its part, everything else cleared.
    setTab('charger');
    setFilters({ ...DEFAULT_FILTERS, generation: highlight.generation });
    setSelected(highlight.componentId);
    setAnnouncement(`New report: ${TAXONOMY[highlight.componentId].label} at ${siteById(highlight.siteId).name}.`);
  }, [highlight]);

  const charger = filters.chargerId ? chargerById(filters.chargerId) : undefined;
  const generation: Generation = charger?.generation ?? filters.generation ?? 'Gen 1';
  const iv = charger ? INTERVENTIONS.find((i) => i.chargerIds.includes(charger.id) && i.date <= filters.to) : undefined;
  const variant: ModelVariant = generation === 'Gen 2' ? 'gen2' : iv ? 'gen1-modified' : 'gen1';

  const filtered = useMemo(() => applyFilters(reports, filters), [reports, filters]);
  const scoped = useMemo(() => filtered.filter((r) => r.generation === generation), [filtered, generation]);
  const counts = useMemo(() => componentCounts(scoped), [scoped]);
  const max = Math.max(0, ...Object.values(counts));
  const heat = useMemo(
    () =>
      Object.fromEntries(
        COMPONENT_IDS.map((id) => [id, { value: counts[id], level: heatLevel(counts[id], max), display: String(counts[id]) } satisfies HeatCell]),
      ) as Record<ComponentId, HeatCell>,
    [counts, max],
  );

  const scopeLabel = charger
    ? `${charger.name}, ${siteById(charger.siteId).name} (${charger.generation}${iv ? ', holster lowered and support arm fitted' : ''})`
    : `All ${generation} chargers${filters.siteId ? ` at ${siteById(filters.siteId).name}` : ''}`;

  const model = {
    variant,
    heat,
    selected,
    hovered,
    pulse: highlight && highlight.generation === generation ? highlight.componentId : null,
    onHover: setHovered,
    onSelect: (id: ComponentId) => setSelected((s) => (s === id ? null : id)),
  };

  const topId = (Object.entries(counts) as [ComponentId, number][]).sort((a, b) => b[1] - a[1])[0];
  const modelLabel = `3D model of a ${generation} charger, coloured by number of reports. ${
    topId && topId[1] ? `Top hotspot: ${TAXONOMY[topId[0]].label}, ${topId[1]} reports, ${HEAT_LABELS[heatLevel(topId[1], max)]}.` : 'No reports.'
  } Use the parts list below to choose a part with the keyboard.`;

  const openCharger = (c: Charger) => {
    setFilters({ ...filters, chargerId: c.id, siteId: c.siteId, generation: c.generation });
    setSelected(null);
    setTab('charger');
  };

  return (
    <div className="flex min-h-dvh flex-col bg-cream text-ink">
      <header className="flex flex-wrap items-center gap-x-4 gap-y-2 border-b border-ink/15 px-5 py-3">
        {!embedded && (
          <Link to="/" aria-label="Back to the start">
            <CicelyWordmark className="h-6" />
          </Link>
        )}
        <p className="font-heading text-lg">{OPERATOR.name}</p>
        <p className="rounded-full bg-dandelion px-3 py-1 text-sm font-semibold" role="note">
          Demo with synthetic data
        </p>
        <nav aria-label="Operator sections" className="ml-auto flex flex-wrap gap-1">
          {TABS.map((t) => (
            <button
              key={t.id}
              type="button"
              aria-current={tab === t.id ? 'page' : undefined}
              onClick={() => setTab(t.id)}
              className={`min-h-11 rounded-full px-4 font-heading ${tab === t.id ? 'bg-ink text-cream' : 'hover:bg-ink/10'}`}
            >
              {t.label}
            </button>
          ))}
        </nav>
        <label className="flex min-h-11 items-center gap-2 text-sm">
          <input type="checkbox" checked={use2D} onChange={(e) => setUse2D(e.target.checked)} className="h-5 w-5 accent-ink" />
          2D view
        </label>
      </header>
      <p role="status" aria-live="polite" className="sr-only">
        {announcement}
      </p>
      {highlight && tab === 'charger' && (
        <div className="flex flex-wrap items-center gap-3 bg-malibu/30 px-5 py-2 text-sm">
          <span className="pulse inline-block h-3 w-3 rounded-full bg-malibu" aria-hidden="true" />
          <span>
            <strong>New report:</strong> {TAXONOMY[highlight.componentId].label} on {chargerById(highlight.chargerId)?.name},{' '}
            {siteById(highlight.siteId).name}.
          </span>
          <button type="button" className="ml-auto min-h-10 underline underline-offset-4" onClick={() => setHighlightId(null)}>
            Dismiss
          </button>
        </div>
      )}

      {tab === 'charger' && (
        <div className="grid flex-1 gap-4 p-4 lg:grid-cols-[272px_minmax(0,1fr)_340px]">
          <aside className="rounded-2xl bg-paper/50 p-4 lg:max-h-[calc(100dvh-110px)] lg:overflow-y-auto">
            <FilterRail filters={filters} onChange={setFilters} reports={reports} generation={generation} />
          </aside>

          <section aria-label="Charger model" className="flex min-w-0 flex-col">
            <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
              <div>
                <h1 className="text-xl">{scopeLabel}</h1>
                <p className="text-sm text-ink-soft">
                  {scoped.length} reports{filters.generation === null && !charger ? `. Gen 2 has ${filtered.length - scoped.length}.` : '.'}
                </p>
              </div>
              <div role="radiogroup" aria-label="Model" className="flex rounded-full border-2 border-ink p-0.5">
                {(['Gen 1', 'Gen 2'] as Generation[]).map((g) => (
                  <button
                    key={g}
                    type="button"
                    role="radio"
                    aria-checked={generation === g}
                    onClick={() => setFilters({ ...filters, generation: g, chargerId: null })}
                    className={`min-h-10 rounded-full px-4 font-heading ${generation === g ? 'bg-ink text-cream' : ''}`}
                  >
                    {g}
                  </button>
                ))}
              </div>
            </div>
            <Viewport model={model} label={modelLabel} use2D={use2D} preset={preset} onPreset={setPreset} />
            <div className="mt-3 h-36 rounded-2xl bg-paper/50 p-3">
              <TrendStrip
                reports={selected ? scoped.filter((r) => r.componentId === selected) : scoped}
                filters={filters}
                title={selected ? `${TAXONOMY[selected].label}: trend` : 'All parts: trend'}
              />
            </div>
          </section>

          <aside aria-label="Detail" className="rounded-2xl bg-paper/60 p-4 lg:max-h-[calc(100dvh-110px)] lg:overflow-y-auto">
            <DetailPanel
              component={selected}
              scoped={scoped}
              allReports={reports}
              filters={filters}
              generation={generation}
              highlightId={highlightId}
              onClose={() => setSelected(null)}
            />
          </aside>
        </div>
      )}

      {tab === 'portfolio' && (
        <div className="p-5">
          <h1 className="mb-3 text-2xl">All chargers</h1>
          <Portfolio reports={applyFilters(reports, { ...DEFAULT_FILTERS, from: filters.from, to: filters.to })} filters={filters} onOpen={openCharger} />
        </div>
      )}

      {tab === 'beforeafter' && (
        <div className="p-5">
          <h1 className="sr-only">Before and after</h1>
          <BeforeAfter reports={reports} use2D={use2D} />
        </div>
      )}

      <footer className="mt-auto border-t border-ink/10 px-5 py-3 text-xs text-ink-soft">
        Patterns in charging equipment, not monitoring individuals. Synthetic data for a concept demo; {OPERATOR.name} is fictional.
      </footer>
    </div>
  );
}

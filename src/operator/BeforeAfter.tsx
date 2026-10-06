import { useMemo, useState } from 'react';
import { INTERVENTIONS, chargerById, siteById } from '../data/network';
import { COMPONENT_IDS, TAXONOMY, type ComponentId } from '../data/taxonomy';
import type { Report } from '../data/types';
import { HeatLegend } from '../components/HeatBadge';
import { beforeAfter, fmtRate, heatLevel } from './analytics';
import type { HeatCell, ModelVariant } from './ChargerModel';
import type { CameraPreset } from './Scene';
import { Viewport } from './Viewport';

type Mode = 'before' | 'after' | 'compare';
const fmtDate = (iso: string) => new Date(iso).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' });

export function BeforeAfter({ reports, use2D }: { reports: Report[]; use2D: boolean }) {
  const [ivId, setIvId] = useState(INTERVENTIONS[0].id);
  const [mode, setMode] = useState<Mode>('compare');
  const [selected, setSelected] = useState<ComponentId | null>('holster');
  const [hovered, setHovered] = useState<ComponentId | null>(null);
  const [preset, setPreset] = useState<CameraPreset>('front');
  const iv = INTERVENTIONS.find((i) => i.id === ivId)!;
  const ba = useMemo(() => beforeAfter(reports, iv), [reports, iv]);
  const gen = chargerById(iv.chargerIds[0])!.generation;
  const beforeVariant: ModelVariant = gen === 'Gen 1' ? 'gen1' : 'gen2';
  const afterVariant: ModelVariant = gen === 'Gen 1' ? 'gen1-modified' : 'gen2';

  // Same scale on both sides: rate per 100 sessions, max across before and after.
  const maxRate = Math.max(...ba.rows.map((r) => Math.max(r.beforeRate, r.afterRate)), 0);
  const heat = (side: 'before' | 'after') =>
    Object.fromEntries(
      COMPONENT_IDS.map((id) => {
        const row = ba.rows.find((r) => r.componentId === id);
        const rate = row ? (side === 'before' ? row.beforeRate : row.afterRate) : 0;
        return [id, { value: rate, level: heatLevel(rate, maxRate), display: fmtRate(rate) } satisfies HeatCell];
      }),
    ) as Record<ComponentId, HeatCell>;

  const modelProps = (side: 'before' | 'after') => ({
    variant: side === 'before' ? beforeVariant : afterVariant,
    heat: heat(side),
    selected,
    hovered,
    onHover: setHovered,
    onSelect: (id: ComponentId) => setSelected((s) => (s === id ? null : id)),
  });

  const site = siteById(iv.siteId);
  const sides: ('before' | 'after')[] = mode === 'compare' ? ['before', 'after'] : [mode];
  const significant = ba.rows.filter((r) => Math.abs(r.change) >= 0.15);

  return (
    <div className="grid gap-6 xl:grid-cols-[280px_1fr]">
      <aside>
        <h2 className="text-lg">Intervention log</h2>
        <ul className="mt-2 space-y-2" role="radiogroup" aria-label="Interventions">
          {INTERVENTIONS.map((i) => (
            <li key={i.id}>
              <button
                type="button"
                role="radio"
                aria-checked={i.id === ivId}
                onClick={() => setIvId(i.id)}
                className={`w-full rounded-2xl border-2 p-3 text-left ${i.id === ivId ? 'border-ink bg-paper' : 'border-ink/20'}`}
              >
                <span className="block text-sm text-ink-soft">{fmtDate(i.date)}</span>
                <span className="block font-heading">{siteById(i.siteId).name}</span>
                <span className="block text-sm">{i.description}</span>
                <span className="block text-xs text-ink-soft">Chargers: {i.chargerIds.map((c) => chargerById(c)!.name.replace('Charger ', '')).join(', ')}</span>
              </button>
            </li>
          ))}
        </ul>
        <p className="mt-4 rounded-xl bg-dandelion p-3 text-sm">
          Fewer reports could also reflect fewer visits. Compare rates per 100 sessions.
        </p>
        <p className="mt-2 text-xs text-ink-soft">
          Before: {ba.before.length} reports over about {Math.round(ba.beforeSessions)} sessions. After: {ba.after.length} reports over about{' '}
          {Math.round(ba.afterSessions)} sessions.
        </p>
      </aside>

      <div className="min-w-0">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-xl">{site.name}</h2>
            <p className="text-sm text-ink-soft">{iv.description}, {fmtDate(iv.date)}. Numbers are reports per 100 sessions.</p>
          </div>
          <div role="radiogroup" aria-label="Show" className="flex rounded-full border-2 border-ink p-0.5">
            {(['before', 'after', 'compare'] as Mode[]).map((m) => (
              <button
                key={m}
                type="button"
                role="radio"
                aria-checked={mode === m}
                onClick={() => setMode(m)}
                className={`min-h-10 rounded-full px-4 font-heading ${mode === m ? 'bg-ink text-cream' : ''}`}
              >
                {m === 'before' ? 'Before' : m === 'after' ? 'After' : 'Compare'}
              </button>
            ))}
          </div>
        </div>

        <div className={`mt-3 grid gap-3 ${sides.length === 2 ? 'lg:grid-cols-2' : ''}`}>
          {sides.map((side) => (
            <div key={side} className="h-[420px]">
              <p className="mb-1 font-heading">
                {side === 'before' ? `Before ${fmtDate(iv.date)}` : `After, with the change`}
              </p>
              <Viewport
                model={modelProps(side)}
                label={`${side === 'before' ? 'Before' : 'After'} the change: charger model coloured by reports per 100 sessions`}
                use2D={use2D}
                preset={preset}
                onPreset={side === sides[0] ? setPreset : undefined}
                compact
              />
            </div>
          ))}
        </div>
        <div className="mt-8">
          <HeatLegend />
        </div>

        <div className="mt-4 overflow-x-auto">
          <table className="w-full min-w-[520px] text-left text-sm">
            <caption className="pb-2 text-left font-heading text-base">Change by part, reports per 100 sessions</caption>
            <thead className="bg-cream-deep">
              <tr>
                <th scope="col" className="p-2">Part</th>
                <th scope="col" className="p-2 text-right">Before</th>
                <th scope="col" className="p-2 text-right">After</th>
                <th scope="col" className="p-2 text-right">Change</th>
                <th scope="col" className="p-2">What it means</th>
              </tr>
            </thead>
            <tbody>
              {ba.rows.map((r) => {
                const up = r.change > 0;
                const big = significant.includes(r);
                return (
                  <tr
                    key={r.componentId}
                    className={`border-t border-ink/10 ${big ? (up ? 'bg-bubblegum/60' : 'bg-mint/60') : ''} ${selected === r.componentId ? 'outline-2 outline-ink' : ''}`}
                  >
                    <th scope="row" className="p-0">
                      <button type="button" className="min-h-10 w-full px-2 text-left font-semibold" onClick={() => setSelected(r.componentId)}>
                        {TAXONOMY[r.componentId].label}
                      </button>
                    </th>
                    <td className="p-2 text-right tabular-nums">{fmtRate(r.beforeRate)} <span className="text-ink-soft">({r.before})</span></td>
                    <td className="p-2 text-right tabular-nums">{fmtRate(r.afterRate)} <span className="text-ink-soft">({r.after})</span></td>
                    <td className="p-2 text-right tabular-nums">
                      <span aria-hidden="true">{up ? '▲' : r.change < 0 ? '▼' : '•'} </span>
                      {up ? '+' : ''}
                      {fmtRate(r.change)}
                    </td>
                    <td className="p-2">{big ? (up ? 'Reports moved here' : 'Fell after the change') : 'Little change'}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        {significant.some((r) => r.componentId === 'cable' && r.change > 0) && (
          <p className="mt-3 rounded-xl bg-sky/40 p-3 text-sm">
            Holster reports fell after the change, but cable reports rose. Drivers can now reach the plug, and the weight of the cable is the next
            barrier. That points to the next decision: cable weight and support.
          </p>
        )}
      </div>
    </div>
  );
}

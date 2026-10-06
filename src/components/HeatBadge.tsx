import { HEAT_COLOURS, HEAT_LABELS, type HeatLevel } from '../operator/analytics';

export function HeatSwatch({ level }: { level: HeatLevel }) {
  return (
    <span
      aria-hidden="true"
      className="inline-block h-3.5 w-3.5 shrink-0 rounded-full border border-ink/40"
      style={{ background: HEAT_COLOURS[level] }}
    />
  );
}

export function HeatBadge({ count, level, compact = false }: { count: number; level: HeatLevel; compact?: boolean }) {
  return (
    <span
      className="inline-flex items-center gap-1.5 rounded-full border border-ink/30 px-2 py-0.5 text-xs font-semibold text-ink"
      style={{ background: HEAT_COLOURS[level] }}
    >
      <span className="tabular-nums">{count}</span>
      {!compact && <span className="font-normal">{HEAT_LABELS[level]}</span>}
    </span>
  );
}

export function HeatLegend() {
  return (
    <ul className="flex flex-wrap gap-x-3 gap-y-1 text-xs" aria-label="Heat map key">
      {([1, 2, 3, 4] as HeatLevel[]).map((l) => (
        <li key={l} className="flex items-center gap-1.5">
          <HeatSwatch level={l} />
          {HEAT_LABELS[l]}
        </li>
      ))}
      <li className="flex items-center gap-1.5">
        <HeatSwatch level={0} />
        None
      </li>
    </ul>
  );
}

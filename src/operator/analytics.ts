import { CHARGERS, DATA_END, DATA_START, chargerById, type Intervention } from '../data/network';
import { COMPONENT_IDS, type ComponentId } from '../data/taxonomy';
import type { GroupId, ImpactId, Outcome } from '../data/impacts';
import type { EntryPoint, Generation, Report } from '../data/types';

export interface Filters {
  from: string;
  to: string;
  siteId: string | null;
  chargerId: string | null;
  generation: Generation | null;
  impact: ImpactId | null;
  outcome: Outcome | null;
  group: GroupId | null;
  conditions: 'any' | 'wet' | 'dark' | 'wet_or_dark';
  entryPoint: EntryPoint | null;
}

const TODAY = new Date().toISOString().slice(0, 10);
/** Live demo reports are dated today, which may be after the synthetic window. */
export const LATEST_DATE = TODAY > DATA_END ? TODAY : DATA_END;

export const DEFAULT_FILTERS: Filters = {
  from: DATA_START,
  to: LATEST_DATE,
  siteId: null,
  chargerId: null,
  generation: null,
  impact: null,
  outcome: null,
  group: null,
  conditions: 'any',
  entryPoint: null,
};

const DAY = 86_400_000;
const endOfDay = (iso: string) => Date.parse(iso) + DAY - 1;

export function applyFilters(reports: Report[], f: Filters): Report[] {
  const from = Date.parse(f.from);
  const to = endOfDay(f.to);
  return reports.filter((r) => {
    const t = Date.parse(r.createdAt);
    if (t < from || t > to) return false;
    if (f.siteId && r.siteId !== f.siteId) return false;
    if (f.chargerId && r.chargerId !== f.chargerId) return false;
    if (f.generation && r.generation !== f.generation) return false;
    if (f.impact && !r.impacts.includes(f.impact)) return false;
    if (f.outcome && r.outcome !== f.outcome) return false;
    if (f.group && !r.selfDescribedGroups?.includes(f.group)) return false;
    if (f.conditions === 'wet' && r.weather !== 'wet') return false;
    if (f.conditions === 'dark' && r.weather !== 'dark') return false;
    if (f.conditions === 'wet_or_dark' && r.weather !== 'wet' && r.weather !== 'dark') return false;
    if (f.entryPoint && r.entryPoint !== f.entryPoint) return false;
    return true;
  });
}

export function countBy<K extends string>(items: Report[], key: (r: Report) => K | K[] | undefined) {
  const out = new Map<K, number>();
  for (const r of items) {
    const k = key(r);
    if (k === undefined) continue;
    for (const kk of Array.isArray(k) ? k : [k]) out.set(kk, (out.get(kk) ?? 0) + 1);
  }
  return out;
}

export function componentCounts(reports: Report[]): Record<ComponentId, number> {
  const out = Object.fromEntries(COMPONENT_IDS.map((id) => [id, 0])) as Record<ComponentId, number>;
  for (const r of reports) out[r.componentId]++;
  return out;
}

export type HeatLevel = 0 | 1 | 2 | 3 | 4;
export const HEAT_LABELS = ['No reports', 'Low', 'Moderate', 'High', 'Very high'] as const;
export const HEAT_COLOURS = ['#d9d4c4', '#fff3bf', '#ffe96a', '#fe8d54', '#ff7199'] as const;

export function heatLevel(value: number, max: number): HeatLevel {
  if (value <= 0 || max <= 0) return 0;
  const f = value / max;
  if (f < 0.25) return 1;
  if (f < 0.5) return 2;
  if (f < 0.75) return 3;
  return 4;
}

/** Months covered by a date range, used to turn sessions per month into sessions. */
export function monthsBetween(fromIso: string, toIso: string) {
  return Math.max(0, (endOfDay(toIso) - Date.parse(fromIso)) / (DAY * 30.44));
}

export function sessionsFor(chargerIds: string[], fromIso: string, toIso: string) {
  const months = monthsBetween(fromIso, toIso);
  return chargerIds.reduce((s, id) => s + (chargerById(id)?.sessionsPerMonth ?? 0) * months, 0);
}

export const ratePer100 = (count: number, sessions: number) => (sessions > 0 ? (count / sessions) * 100 : 0);

export function monthlySeries(reports: Report[], fromIso: string, toIso: string) {
  const start = new Date(fromIso);
  const end = new Date(toIso);
  const buckets: { key: string; label: string; count: number }[] = [];
  const d = new Date(start.getFullYear(), start.getMonth(), 1);
  while (d <= end) {
    buckets.push({
      key: `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`,
      label: d.toLocaleString('en-GB', { month: 'short' }),
      count: 0,
    });
    d.setMonth(d.getMonth() + 1);
  }
  for (const r of reports) {
    const b = buckets.find((x) => x.key === r.createdAt.slice(0, 7));
    if (b) b.count++;
  }
  return buckets;
}

export function chargersInScope(f: Filters, generation?: Generation) {
  return CHARGERS.filter(
    (c) =>
      (!f.siteId || c.siteId === f.siteId) &&
      (!f.chargerId || c.id === f.chargerId) &&
      (!(generation ?? f.generation) || c.generation === (generation ?? f.generation)),
  );
}

export interface BeforeAfterRow {
  componentId: ComponentId;
  before: number;
  after: number;
  beforeRate: number;
  afterRate: number;
  change: number;
}

export function beforeAfter(reports: Report[], iv: Intervention) {
  const at = Date.parse(iv.date);
  const scoped = reports.filter((r) => iv.chargerIds.includes(r.chargerId));
  const before = scoped.filter((r) => Date.parse(r.createdAt) < at);
  const after = scoped.filter((r) => Date.parse(r.createdAt) >= at);
  const dayBefore = new Date(at - DAY).toISOString().slice(0, 10);
  const beforeSessions = sessionsFor(iv.chargerIds, DATA_START, dayBefore);
  const afterSessions = sessionsFor(iv.chargerIds, iv.date, LATEST_DATE);
  const bc = componentCounts(before);
  const ac = componentCounts(after);
  const rows: BeforeAfterRow[] = COMPONENT_IDS.filter((id) => bc[id] || ac[id]).map((id) => {
    const beforeRate = ratePer100(bc[id], beforeSessions);
    const afterRate = ratePer100(ac[id], afterSessions);
    return { componentId: id, before: bc[id], after: ac[id], beforeRate, afterRate, change: afterRate - beforeRate };
  });
  rows.sort((a, b) => Math.abs(b.change) - Math.abs(a.change));
  return { before, after, beforeSessions, afterSessions, rows, beforeCounts: bc, afterCounts: ac };
}

export const pct = (n: number, d: number) => (d ? Math.round((n / d) * 100) : 0);
export const fmtRate = (r: number) => r.toFixed(2);

import type { Generation } from './types';

export const OPERATOR = { id: 'northway', name: 'Northway Charging' } as const;

export interface Site {
  id: string;
  name: string;
  area: string;
  address: string;
  /** Position on the stub map, 0..100 */
  map: { x: number; y: number };
}

export interface Charger {
  id: string;
  siteId: string;
  name: string;
  assetId: string;
  model: string;
  generation: Generation;
  /** Synthetic sessions per month, used for rates per 100 sessions. */
  sessionsPerMonth: number;
  pricePerKwh: number;
}

export const SITES: Site[] = [
  { id: 'ealing', name: 'Ealing Broadway Hub', area: 'Ealing', address: 'Haven Green car park, London W5', map: { x: 22, y: 42 } },
  { id: 'lewisham', name: 'Lewisham Leisure Centre', area: 'Lewisham', address: 'Rennell Street, London SE13', map: { x: 68, y: 66 } },
  { id: 'stratford', name: 'Stratford Retail Park', area: 'Stratford', address: 'Warton Road, London E15', map: { x: 74, y: 30 } },
  { id: 'brixton', name: 'Brixton Hill car park', area: 'Brixton', address: 'Brixton Hill, London SW2', map: { x: 46, y: 74 } },
  { id: 'ashby', name: 'Ashby Fields Services', area: 'M1 motorway', address: 'M1 junction 18, Northamptonshire', map: { x: 40, y: 14 } },
];

const c = (
  siteId: string,
  n: number,
  generation: Generation,
  sessionsPerMonth: number,
  model = 'Rapid 50 kW',
): Charger => ({
  id: `${siteId}-${n}`,
  siteId,
  name: `Charger ${n}`,
  assetId: `NW-${siteId.slice(0, 3).toUpperCase()}-${String(n).padStart(2, '0')}`,
  model,
  generation,
  sessionsPerMonth,
  pricePerKwh: generation === 'Gen 1' ? 0.69 : 0.74,
});

export const CHARGERS: Charger[] = [
  c('ealing', 1, 'Gen 1', 210),
  c('ealing', 2, 'Gen 1', 190),
  c('ealing', 3, 'Gen 1', 230),
  c('lewisham', 1, 'Gen 1', 160),
  c('lewisham', 2, 'Gen 1', 150),
  c('lewisham', 3, 'Gen 2', 170),
  c('stratford', 1, 'Gen 2', 240),
  c('stratford', 2, 'Gen 2', 260),
  c('stratford', 3, 'Gen 1', 200),
  c('brixton', 1, 'Gen 1', 140),
  c('brixton', 2, 'Gen 2', 150),
  c('ashby', 1, 'Gen 2', 420, 'Rapid 150 kW'),
  c('ashby', 2, 'Gen 2', 400, 'Rapid 150 kW'),
  c('ashby', 3, 'Gen 1', 360),
];

export const siteById = (id: string) => SITES.find((s) => s.id === id)!;
export const chargerById = (id: string) => CHARGERS.find((ch) => ch.id === id);

export interface Intervention {
  id: string;
  date: string; // ISO date
  siteId: string;
  chargerIds: string[];
  description: string;
}

export const INTERVENTIONS: Intervention[] = [
  {
    id: 'ealing-holster',
    date: '2026-05-18',
    siteId: 'ealing',
    chargerIds: ['ealing-1', 'ealing-2', 'ealing-3'],
    description: 'Lower holster and cable support arm fitted',
  },
];

/** Synthetic data window. */
export const DATA_START = '2026-01-01';
export const DATA_END = '2026-09-30';

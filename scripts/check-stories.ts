// Prints tables proving the four built-in stories exist in the seed data.
// Run with: npm run stories
import { SEED_REPORTS } from '../src/data/seed';
import { INTERVENTIONS } from '../src/data/network';
import { beforeAfter, componentCounts } from '../src/operator/analytics';

const r = SEED_REPORTS;
console.log('Total seed reports:', r.length);

const top = (g: string) =>
  Object.entries(componentCounts(r.filter((x) => x.generation === g)))
    .sort((a, b) => b[1] - a[1])
    .slice(0, 4);
console.log('\nStory 1 and 4: top components by generation');
console.table({ 'Gen 1': Object.fromEntries(top('Gen 1')), 'Gen 2': Object.fromEntries(top('Gen 2')) });

const holster = r.filter((x) => x.generation === 'Gen 1' && x.componentId === 'holster');
const share = (pred: (x: (typeof r)[number]) => boolean) => `${Math.round((holster.filter(pred).length / holster.length) * 100)}%`;
console.table({
  'Gen 1 holster reports': holster.length,
  'Too much strength': share((x) => x.impacts.includes('too_much_strength')),
  'Hard to reach': share((x) => x.impacts.includes('hard_to_reach')),
  'Needed help (impact or outcome)': share((x) => x.impacts.includes('needed_help') || x.outcome === 'completed_with_help'),
  'Wheelchair or limited grip': share((x) => !!x.selfDescribedGroups?.some((g) => g === 'wheelchair_user' || g === 'limited_grip')),
});

console.log('\nStory 2: card reader at each site, by conditions');
const pay = r.filter((x) => x.componentId === 'payment_terminal');
const bySite: Record<string, Record<string, number>> = {};
for (const p of pay) {
  bySite[p.siteId] ??= { dry: 0, wet: 0, dark: 0 };
  bySite[p.siteId][p.weather ?? 'dry']++;
}
console.table(bySite);

console.log('\nStory 3: Ealing before and after (rate per 100 sessions)');
const ba = beforeAfter(r, INTERVENTIONS[0]);
console.table(
  Object.fromEntries(
    ba.rows.slice(0, 5).map((row) => [row.componentId, { before: row.before, after: row.after, beforeRate: row.beforeRate.toFixed(2), afterRate: row.afterRate.toFixed(2) }]),
  ),
);

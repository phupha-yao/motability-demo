import { CHARGERS, DATA_END, DATA_START, INTERVENTIONS, OPERATOR, type Charger } from './network';
import type { GroupId, ImpactId, Outcome } from './impacts';
import type { ComponentId } from './taxonomy';
import type { EntryPoint, IdentifiedBy, Report, Weather } from './types';
import { maskFor, photoForGeneration } from './photos';
import { makeRng } from './rng';

type Weights<T extends string> = Partial<Record<T, number>>;

// Base component weights. Story 4: Gen 2 has far fewer holster reports.
const GEN1: Weights<ComponentId> = {
  holster: 46, connector: 11, cable: 10, payment_terminal: 9, screen: 8, bay_space: 6,
  kerb: 5, buttons: 4, bollards: 4, rfid_reader: 3, bay_surface: 3, signage: 3, lighting: 2, emergency_stop: 1,
};
const GEN2: Weights<ComponentId> = {
  holster: 3, connector: 10, cable: 10, cable_management: 5, payment_terminal: 9, screen: 8, bay_space: 7,
  kerb: 4, buttons: 3, bollards: 4, rfid_reader: 3, bay_surface: 3, signage: 3, lighting: 2, emergency_stop: 1,
};
// Story 3: after the Ealing intervention, holster reports fall and some move to the cable.
const EALING_AFTER: Weights<ComponentId> = {
  holster: 4, cable: 30, cable_management: 6, connector: 10, payment_terminal: 9, screen: 8, bay_space: 6,
  kerb: 5, buttons: 4, bollards: 4, rfid_reader: 3, bay_surface: 3, signage: 3, lighting: 2,
};

const IMPACTS_BY_COMPONENT: Partial<Record<ComponentId, Weights<ImpactId>>> = {
  holster: { too_much_strength: 10, hard_to_reach: 9, needed_help: 7, could_not_charge: 2 },
  connector: { too_much_strength: 9, hard_to_understand: 2, needed_help: 4, could_not_charge: 2 },
  cable: { too_much_strength: 10, needed_help: 5, felt_unsafe: 2, hard_to_reach: 2 },
  cable_management: { hard_to_reach: 4, too_much_strength: 3, hard_to_understand: 2 },
  payment_terminal: { hard_to_see: 8, hard_to_reach: 6, hard_to_understand: 3, could_not_charge: 2 },
  screen: { hard_to_see: 9, hard_to_understand: 6, hard_to_reach: 2 },
  rfid_reader: { hard_to_reach: 5, hard_to_understand: 3 },
  buttons: { hard_to_reach: 4, too_much_strength: 3, hard_to_understand: 3 },
  emergency_stop: { hard_to_understand: 3, felt_unsafe: 2 },
  bollards: { hard_to_reach: 4, felt_unsafe: 2, something_else: 2 },
  kerb: { hard_to_reach: 6, felt_unsafe: 4, needed_help: 3 },
  bay_surface: { felt_unsafe: 5, hard_to_reach: 3 },
  bay_space: { hard_to_reach: 6, could_not_charge: 3, felt_unsafe: 2 },
  signage: { hard_to_see: 5, hard_to_understand: 6 },
  lighting: { hard_to_see: 6, felt_unsafe: 5 },
};

const OUTCOMES_BY_COMPONENT: Partial<Record<ComponentId, Weights<Outcome>>> = {
  holster: { completed: 30, completed_with_help: 42, abandoned: 28 },
  connector: { completed: 50, completed_with_help: 30, abandoned: 20 },
  cable: { completed: 50, completed_with_help: 35, abandoned: 15 },
  bay_space: { completed: 50, completed_with_help: 20, abandoned: 30 },
  kerb: { completed: 55, completed_with_help: 30, abandoned: 15 },
};
const DEFAULT_OUTCOMES: Weights<Outcome> = { completed: 70, completed_with_help: 18, abandoned: 12 };

const GROUPS_BY_COMPONENT: Partial<Record<ComponentId, Weights<GroupId>>> = {
  holster: { wheelchair_user: 10, limited_grip: 9, short_stature: 3, limited_mobility: 2 },
  connector: { limited_grip: 9, wheelchair_user: 3, limited_mobility: 2 },
  cable: { limited_grip: 8, wheelchair_user: 5, limited_mobility: 3 },
  payment_terminal: { sight_loss: 6, wheelchair_user: 5, short_stature: 3 },
  screen: { sight_loss: 8, neurodivergent: 3, wheelchair_user: 2 },
  signage: { sight_loss: 4, neurodivergent: 4 },
  kerb: { wheelchair_user: 7, limited_mobility: 5 },
  bay_space: { wheelchair_user: 9, limited_mobility: 4 },
  bay_surface: { limited_mobility: 5, wheelchair_user: 4 },
};
const DEFAULT_GROUPS: Weights<GroupId> = {
  limited_mobility: 4, wheelchair_user: 3, sight_loss: 2, limited_grip: 2, hearing_loss: 1, neurodivergent: 2,
};

const NOTES: Partial<Record<ComponentId, string[]>> = {
  holster: [
    'Plug is clipped in really high. I had to stand on the plinth edge to pull it out.',
    'Could not get the plug out of the holder from my chair. A passer-by helped.',
    'The holder grips the plug so tightly I needed both hands.',
    'Too high to reach and stiff to release.',
  ],
  connector: ['Plug is very heavy and the trigger is stiff.', 'Had to push hard to get it to click into the car.'],
  cable: [
    'Cable is so heavy it pulls the plug out of my hand.',
    'Arm helps but the cable still drags on the ground and is heavy to lift.',
    'Cable is too short to reach my charge port without reversing in.',
  ],
  payment_terminal: [
    'Glare on the card reader screen, could not read the amount.',
    'In the rain the screen was unreadable.',
    'Card reader too high from my wheelchair.',
  ],
  screen: ['Screen washed out in sunlight.', 'Text on the screen is tiny and moves on too fast.'],
  bay_space: ['Not enough room to get my wheelchair out beside the car.', 'Bay is too narrow to open the door fully.'],
  kerb: ['High kerb between the bay and the charger, no dropped section.'],
  lighting: ['Very dark here at night, could not see the buttons.'],
  signage: ['Instructions sticker is faded.'],
  bay_surface: ['Bay slopes and my chair rolled.'],
};

const ENTRY: Weights<EntryPoint> = { go_app: 60, qr_on_charger: 20, operator_app: 12, zapmap: 8 };
const IDENTIFIED: Record<EntryPoint, IdentifiedBy> = {
  go_app: 'location',
  zapmap: 'location',
  operator_app: 'asset_id',
  qr_on_charger: 'qr',
};

const DAY = 86_400_000;

function chargerWeight(ch: Charger) {
  return ch.sessionsPerMonth * (ch.generation === 'Gen 1' ? 1.5 : 0.7);
}

export function generateSeedReports(): Report[] {
  const rng = makeRng(1899);
  const start = Date.parse(DATA_START);
  const end = Date.parse(DATA_END) + DAY - 1;
  const intervention = INTERVENTIONS[0];
  const interventionTime = Date.parse(intervention.date);
  const chargerWeights = Object.fromEntries(CHARGERS.map((ch) => [ch.id, chargerWeight(ch)]));
  const reports: Report[] = [];

  const make = (ch: Charger, time: number, forced?: { componentId: ComponentId; weather: Weather; impacts: ImpactId[] }) => {
    const afterFix = intervention.chargerIds.includes(ch.id) && time >= interventionTime;
    const componentId =
      forced?.componentId ?? rng.weighted<ComponentId>(afterFix ? EALING_AFTER : ch.generation === 'Gen 1' ? GEN1 : GEN2);

    let impacts: ImpactId[];
    if (forced) impacts = forced.impacts;
    else {
      const pool = IMPACTS_BY_COMPONENT[componentId] ?? { something_else: 1 };
      const set = new Set<ImpactId>([rng.weighted(pool)]);
      if (rng.chance(0.55)) set.add(rng.weighted(pool));
      if (rng.chance(0.2)) set.add(rng.weighted(pool));
      impacts = [...set];
    }
    const outcome = rng.weighted(OUTCOMES_BY_COMPONENT[componentId] ?? DEFAULT_OUTCOMES);
    if (outcome === 'completed_with_help' && !impacts.includes('needed_help') && rng.chance(0.6)) impacts.push('needed_help');
    if (outcome === 'abandoned' && !impacts.includes('could_not_charge') && rng.chance(0.5)) impacts.push('could_not_charge');

    let selfDescribedGroups: GroupId[] | undefined;
    if (rng.chance(componentId === 'holster' ? 0.82 : 0.6)) {
      const pool = GROUPS_BY_COMPONENT[componentId] ?? DEFAULT_GROUPS;
      const set = new Set<GroupId>([rng.weighted(pool)]);
      if (rng.chance(0.25)) set.add(rng.weighted(pool));
      selfDescribedGroups = [...set];
    }

    const entryPoint = rng.weighted(ENTRY);
    const promptRoll = rng.next();
    const segmentationPrompt: Report['segmentationPrompt'] = promptRoll < 0.6 ? 'tap' : promptRoll < 0.82 ? 'lasso' : 'list';
    const photo = photoForGeneration(ch.generation);
    const mask = segmentationPrompt === 'list' ? undefined : maskFor(photo.id, componentId);
    const notes = NOTES[componentId];
    const hasNote = notes && rng.chance(0.45);
    const weather: Weather = forced?.weather ?? rng.weighted<Weather>({ dry: 70, wet: 15, dark: 15 });

    reports.push({
      id: `seed-${reports.length + 1}`,
      createdAt: new Date(time).toISOString(),
      chargerId: ch.id,
      siteId: ch.siteId,
      operatorId: OPERATOR.id,
      chargerModel: ch.model,
      generation: ch.generation,
      entryPoint,
      identifiedBy: IDENTIFIED[entryPoint],
      photoId: mask ? photo.id : undefined,
      componentId,
      componentConfirmed: rng.chance(0.85),
      segmentationPrompt: mask ? segmentationPrompt : 'list',
      polygon: mask?.polygon,
      impacts,
      outcome,
      note: hasNote ? rng.pick(notes) : undefined,
      noteKind: hasNote ? (rng.chance(0.35) ? 'voice' : 'text') : undefined,
      selfDescribedGroups,
      weather,
    });
  };

  // Background reports across the network.
  for (let i = 0; i < 292; i++) {
    const id = rng.weighted(chargerWeights);
    const ch = CHARGERS.find((x) => x.id === id)!;
    make(ch, start + rng.next() * (end - start));
  }

  // Story 2: card reader glare at Lewisham, in wet and dark conditions.
  const lewisham = CHARGERS.filter((ch) => ch.siteId === 'lewisham');
  for (let i = 0; i < 28; i++) {
    const ch = rng.pick(lewisham);
    const weather: Weather = rng.chance(0.5) ? 'wet' : 'dark';
    const impacts: ImpactId[] = rng.chance(0.4) ? ['hard_to_see', 'could_not_charge'] : ['hard_to_see'];
    make(ch, start + rng.next() * (end - start), { componentId: 'payment_terminal', weather, impacts });
  }

  return reports.sort((a, b) => a.createdAt.localeCompare(b.createdAt));
}

export const SEED_REPORTS = generateSeedReports();

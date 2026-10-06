export const IMPACTS = [
  { id: 'too_much_strength', label: 'Needed too much strength' },
  { id: 'hard_to_reach', label: 'Hard to reach' },
  { id: 'hard_to_see', label: 'Hard to see or read' },
  { id: 'hard_to_understand', label: 'Hard to understand' },
  { id: 'needed_help', label: 'Needed help from someone' },
  { id: 'felt_unsafe', label: 'Felt unsafe' },
  { id: 'could_not_charge', label: 'Could not charge' },
  { id: 'something_else', label: 'Something else' },
] as const;

export type ImpactId = (typeof IMPACTS)[number]['id'];
export const impactLabel = (id: ImpactId) => IMPACTS.find((i) => i.id === id)!.label;

export const OUTCOMES = [
  { id: 'completed', label: 'Yes', long: 'Finished charging' },
  { id: 'completed_with_help', label: 'Yes, with help', long: 'Finished with help' },
  { id: 'abandoned', label: 'No, I left', long: 'Left without charging' },
] as const;
export type Outcome = (typeof OUTCOMES)[number]['id'];
export const outcomeLabel = (id: Outcome) => OUTCOMES.find((o) => o.id === id)!.long;

export const GROUPS = [
  { id: 'wheelchair_user', label: 'I use a wheelchair', short: 'Wheelchair users' },
  { id: 'limited_grip', label: 'I have limited grip or arm strength', short: 'Limited grip or arm strength' },
  { id: 'limited_mobility', label: 'I find walking or standing difficult', short: 'Difficulty walking or standing' },
  { id: 'sight_loss', label: 'I have sight loss', short: 'Sight loss' },
  { id: 'hearing_loss', label: 'I am deaf or have hearing loss', short: 'Deaf or hearing loss' },
  { id: 'neurodivergent', label: 'I am neurodivergent', short: 'Neurodivergent' },
  { id: 'short_stature', label: 'I have short stature', short: 'Short stature' },
] as const;
export type GroupId = (typeof GROUPS)[number]['id'];
export const groupLabel = (id: GroupId) => GROUPS.find((g) => g.id === id)!.short;

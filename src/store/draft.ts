import { create } from 'zustand';
import type { ComponentId } from '../data/taxonomy';
import type { GroupId, ImpactId, Outcome } from '../data/impacts';
import type { EntryPoint, IdentifiedBy } from '../data/types';
import type { SegmentResult } from '../segmentation/types';

export interface Draft {
  entryPoint: EntryPoint;
  identifiedBy: IdentifiedBy;
  chargerId: string;
  photoId?: string;
  photoDataUrl?: string;
  segmentation?: SegmentResult;
  segmentationPrompt?: 'tap' | 'lasso' | 'list';
  componentId?: ComponentId;
  componentConfirmed: boolean;
  impacts: ImpactId[];
  outcome?: Outcome;
  note?: string;
  noteKind?: 'text' | 'voice';
  groups: GroupId[];
  preferNotToSay: boolean;
  submittedId?: string;
}

const initial = (): Draft => ({
  entryPoint: 'go_app',
  identifiedBy: 'location',
  chargerId: 'ealing-3',
  componentConfirmed: false,
  impacts: [],
  groups: [],
  preferNotToSay: false,
});

interface DraftState extends Draft {
  update: (patch: Partial<Draft>) => void;
  start: (chargerId: string, entryPoint: EntryPoint) => void;
  clear: () => void;
}

export const useDraft = create<DraftState>()((set) => ({
  ...initial(),
  update: (patch) => set(patch),
  start: (chargerId, entryPoint) =>
    set({
      ...initial(),
      chargerId,
      entryPoint,
      identifiedBy: entryPoint === 'qr_on_charger' ? 'qr' : 'location',
    }),
  clear: () => set(initial()),
}));

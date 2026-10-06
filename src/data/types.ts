import type { ComponentId } from './taxonomy';
import type { GroupId, ImpactId, Outcome } from './impacts';

export type Generation = 'Gen 1' | 'Gen 2';
export type EntryPoint = 'go_app' | 'zapmap' | 'operator_app' | 'qr_on_charger';
export type IdentifiedBy = 'location' | 'asset_id' | 'qr' | 'driver_confirmed';
export type Weather = 'dry' | 'wet' | 'dark';

export type Report = {
  id: string;
  createdAt: string;
  chargerId: string;
  siteId: string;
  operatorId: string;
  chargerModel: string;
  generation: Generation;
  entryPoint: EntryPoint;
  identifiedBy: IdentifiedBy;
  photoId?: string;
  /** Downscaled data URL when the driver used their own photo (demo only). */
  photoDataUrl?: string;
  componentId: ComponentId;
  componentConfirmed: boolean;
  segmentationPrompt: 'tap' | 'lasso' | 'list';
  polygon?: [number, number][];
  impacts: ImpactId[];
  outcome: Outcome;
  note?: string;
  noteKind?: 'text' | 'voice';
  selfDescribedGroups?: GroupId[];
  weather?: Weather;
  /** True for reports made in this browser during the demo. */
  live?: boolean;
};

export const ENTRY_LABELS: Record<EntryPoint, string> = {
  go_app: 'Go app',
  zapmap: 'Zapmap (possible future)',
  operator_app: 'Operator app',
  qr_on_charger: 'QR code on charger',
};

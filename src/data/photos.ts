import type { ComponentId } from './taxonomy';
import type { Generation } from './types';
import gen1 from './photos/rapid-gen1.masks.json';
import gen2 from './photos/rapid-gen2.masks.json';

export interface Mask {
  componentId: ComponentId;
  polygon: [number, number][];
}

export interface DemoPhoto {
  id: string;
  src: string;
  width: number;
  height: number;
  alt: string;
  masks: Mask[];
}

export const PHOTOS: Record<string, DemoPhoto> = {
  'rapid-gen1': {
    id: 'rapid-gen1',
    src: '/photos/rapid-gen1.svg',
    width: 600,
    height: 800,
    alt: 'A Gen 1 rapid charger on a parking bay, with the plug held high on the side',
    masks: gen1 as Mask[],
  },
  'rapid-gen2': {
    id: 'rapid-gen2',
    src: '/photos/rapid-gen2.svg',
    width: 600,
    height: 800,
    alt: 'A Gen 2 rapid charger with a lower plug holder and an overhead cable arm',
    masks: gen2 as Mask[],
  },
};

export const photoForGeneration = (g: Generation) => (g === 'Gen 1' ? PHOTOS['rapid-gen1'] : PHOTOS['rapid-gen2']);

export const maskFor = (photoId: string | undefined, componentId: ComponentId) =>
  photoId ? PHOTOS[photoId]?.masks.find((m) => m.componentId === componentId) : undefined;

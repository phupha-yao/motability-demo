import type { ComponentId } from '../data/taxonomy';

export type Prompt =
  | { kind: 'tap'; x: number; y: number } // image-space px
  | { kind: 'lasso'; points: [number, number][] }; // rough outline

export interface SegmentResult {
  componentId: ComponentId;
  polygon: [number, number][]; // mask outline in image space
  confidence: number; // 0..1, faked
  alternatives: ComponentId[]; // next best guesses, max 2
}

export interface Segmenter {
  segment(imageId: string, prompt: Prompt): Promise<SegmentResult | null>;
}

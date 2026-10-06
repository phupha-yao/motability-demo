import { PHOTOS, type Mask } from '../data/photos';
import type { ComponentId } from '../data/taxonomy';
import { bbox, distToPolygonEdge, pointInPolygon, polygonArea, type Pt } from './geometry';
import type { Prompt, SegmentResult, Segmenter } from './types';

// A SAM 2 implementation (for example SAM 2 ONNX running in the browser) would satisfy the
// same Segmenter interface: take the image and the tap or outline, return a mask outline.
// This mock looks up pre-authored polygons for the demo photos instead.

const delay = () => new Promise((r) => setTimeout(r, 400 + Math.random() * 300));

/** Merge masks that share a component (e.g. two bollards) so one id maps to one result. */
function byComponent(masks: Mask[]) {
  const map = new Map<ComponentId, Mask[]>();
  for (const m of masks) map.set(m.componentId, [...(map.get(m.componentId) ?? []), m]);
  return map;
}

function rankAlternatives(masks: Mask[], p: Pt, exclude: ComponentId): ComponentId[] {
  const scored = new Map<ComponentId, number>();
  for (const m of masks) {
    if (m.componentId === exclude) continue;
    const d = pointInPolygon(p, m.polygon) ? 0 : distToPolygonEdge(p, m.polygon);
    scored.set(m.componentId, Math.min(scored.get(m.componentId) ?? Infinity, d));
  }
  return [...scored.entries()].sort((a, b) => a[1] - b[1]).slice(0, 2).map(([id]) => id);
}

export function segmentSync(imageId: string, prompt: Prompt): SegmentResult | null {
  const photo = PHOTOS[imageId];
  if (!photo) return null;
  const masks = photo.masks;

  if (prompt.kind === 'tap') {
    const p: Pt = [prompt.x, prompt.y];
    const hits = masks.filter((m) => pointInPolygon(p, m.polygon)).sort((a, b) => polygonArea(a.polygon) - polygonArea(b.polygon));
    if (hits.length) {
      const best = hits[0];
      const nearEdge = distToPolygonEdge(p, best.polygon) < 6;
      return {
        componentId: best.componentId,
        polygon: best.polygon,
        confidence: hits.length > 2 || nearEdge ? 0.6 : 0.9,
        alternatives: rankAlternatives(masks, p, best.componentId),
      };
    }
    let nearest: Mask | null = null;
    let nd = Infinity;
    for (const m of masks) {
      const d = distToPolygonEdge(p, m.polygon);
      if (d < nd) {
        nd = d;
        nearest = m;
      }
    }
    if (!nearest || nd > 60) return null;
    return { componentId: nearest.componentId, polygon: nearest.polygon, confidence: 0.6, alternatives: rankAlternatives(masks, p, nearest.componentId) };
  }

  // Lasso: sample a grid and score each component by overlap (intersection over union).
  const lasso = prompt.points;
  if (lasso.length < 3) return null;
  const box = bbox(lasso);
  const step = 4;
  const lassoArea = polygonArea(lasso) || 1;
  const scores: { id: ComponentId; mask: Mask; iou: number }[] = [];
  for (const [id, group] of byComponent(masks)) {
    for (const m of group) {
      const mb = bbox(m.polygon);
      if (mb.maxX < box.minX || mb.minX > box.maxX || mb.maxY < box.minY || mb.minY > box.maxY) continue;
      let inter = 0;
      for (let x = Math.max(box.minX, mb.minX); x <= Math.min(box.maxX, mb.maxX); x += step)
        for (let y = Math.max(box.minY, mb.minY); y <= Math.min(box.maxY, mb.maxY); y += step)
          if (pointInPolygon([x, y], lasso) && pointInPolygon([x, y], m.polygon)) inter += step * step;
      if (!inter) continue;
      const iou = inter / (lassoArea + polygonArea(m.polygon) - inter);
      scores.push({ id, mask: m, iou });
    }
  }
  if (!scores.length) return null;
  scores.sort((a, b) => b.iou - a.iou);
  const best = scores[0];
  const alternatives = [...new Set(scores.slice(1).map((s) => s.id))].filter((id) => id !== best.id).slice(0, 2);
  const runnerUp = scores.find((s) => s.id !== best.id);
  const clear = best.iou > 0.3 && (!runnerUp || best.iou > runnerUp.iou * 1.6);
  return { componentId: best.id, polygon: best.mask.polygon, confidence: clear ? 0.9 : 0.6, alternatives };
}

export class MockSegmenter implements Segmenter {
  async segment(imageId: string, prompt: Prompt) {
    await delay();
    return segmentSync(imageId, prompt);
  }
}

export const segmenter: Segmenter = new MockSegmenter();

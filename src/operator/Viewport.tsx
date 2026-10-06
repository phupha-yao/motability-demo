import { useState } from 'react';
import { HeatLegend } from '../components/HeatBadge';
import { TAXONOMY, type ComponentId } from '../data/taxonomy';
import { HEAT_COLOURS, HEAT_LABELS } from './analytics';
import type { ChargerModelProps } from './ChargerModel';
import { Elevation2D } from './Elevation2D';
import { CAMERA_PRESETS, Scene, webglAvailable, type CameraPreset } from './Scene';

const GL = typeof document !== 'undefined' && webglAvailable();

/** 3D model (or 2D elevation) plus camera presets and a keyboard-friendly list of parts. */
export function Viewport({
  model,
  label,
  use2D,
  preset,
  onPreset,
  compact = false,
}: {
  model: ChargerModelProps;
  label: string;
  use2D: boolean;
  preset: CameraPreset;
  onPreset?: (p: CameraPreset) => void;
  compact?: boolean;
}) {
  const [nonce, setNonce] = useState(0);
  const twoD = use2D || !GL;
  const ranked = (Object.entries(model.heat) as [ComponentId, NonNullable<ChargerModelProps['heat'][ComponentId]>][])
    .filter(([id, c]) => c.value > 0 && (model.variant !== 'gen1' || id !== 'cable_management'))
    .sort((a, b) => b[1].value - a[1].value);
  const fallback = <Elevation2D {...model} label={label} />;

  return (
    <div className="flex h-full min-h-0 flex-col">
      {!twoD && onPreset && (
        <div role="group" aria-label="Camera" className="flex flex-wrap gap-1.5 pb-2">
          {CAMERA_PRESETS.map((p) => (
            <button
              key={p.id}
              type="button"
              aria-pressed={preset === p.id}
              onClick={() => {
                onPreset(p.id);
                setNonce((n) => n + 1);
              }}
              className={`min-h-10 rounded-full border-2 px-3 text-sm ${preset === p.id ? 'border-ink bg-ink text-cream' : 'border-ink/25 bg-cream'}`}
            >
              {p.label}
            </button>
          ))}
        </div>
      )}
      <div className={`relative overflow-hidden rounded-2xl border border-ink/15 ${compact ? 'min-h-[300px] flex-1' : 'h-[clamp(360px,62vh,640px)]'}`}>
        {twoD ? fallback : <Scene model={model} preset={preset} presetNonce={nonce} label={label} fallback={fallback} />}
        {!GL && !use2D && (
          <p className="absolute inset-x-0 bottom-0 bg-dandelion px-3 py-1 text-xs">3D is not available on this device, so the 2D view is shown.</p>
        )}
      </div>
      {!compact && (
        <div className="mt-2 flex flex-wrap items-start justify-between gap-2">
          <HeatLegend />
          {!twoD && <p className="text-xs text-ink-soft">Drag to rotate, scroll or pinch to zoom.</p>}
        </div>
      )}
      {!compact && (
        <details className="mt-2 text-sm" open={false}>
          <summary className="min-h-10 cursor-pointer py-2 font-semibold">Parts list ({ranked.length} with reports)</summary>
          <ul className="grid gap-1 sm:grid-cols-2">
            {ranked.map(([id, c]) => (
              <li key={id}>
                <button
                  type="button"
                  aria-pressed={model.selected === id}
                  onClick={() => model.onSelect(id)}
                  onFocus={() => model.onHover(id)}
                  onBlur={() => model.onHover(null)}
                  className={`flex min-h-10 w-full items-center justify-between gap-2 rounded-lg border px-2 text-left ${
                    model.selected === id ? 'border-ink bg-paper' : 'border-ink/15'
                  }`}
                >
                  <span>{TAXONOMY[id].label}</span>
                  <span className="flex items-center gap-1.5 text-xs">
                    <span aria-hidden="true" className="h-3 w-3 rounded-full border border-ink/40" style={{ background: HEAT_COLOURS[c.level] }} />
                    {c.display} · {HEAT_LABELS[c.level]}
                  </span>
                </button>
              </li>
            ))}
          </ul>
        </details>
      )}
    </div>
  );
}

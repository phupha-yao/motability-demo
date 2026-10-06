import type { KeyboardEvent } from 'react';
import { TAXONOMY, type ComponentId } from '../data/taxonomy';
import { HEAT_COLOURS, HEAT_LABELS } from './analytics';
import type { ChargerModelProps } from './ChargerModel';

// Front elevation in SVG. 100 units = 1 metre. Ground (bay) at y = 300.
type Shape = { kind: 'rect'; x: number; y: number; w: number; h: number; r?: number } | { kind: 'path'; d: string; stroke: number };

function shapes(variant: ChargerModelProps['variant']): Partial<Record<ComponentId, Shape[]>> {
  const G = 300;
  const I = G - 12; // island top
  const hy = variant === 'gen1' ? 142 : 95;
  const arm = variant !== 'gen1';
  return {
    lighting: [
      { kind: 'rect', x: -150, y: G - 300, w: 8, h: 300 },
      { kind: 'rect', x: -150, y: G - 308, w: 60, h: 10, r: 3 },
    ],
    signage: [{ kind: 'rect', x: -26, y: I - 187, w: 52, h: 14, r: 2 }],
    screen: [{ kind: 'rect', x: -20, y: I - 165, w: 40, h: 30, r: 2 }],
    buttons: [{ kind: 'rect', x: -12, y: I - 131, w: 24, h: 8, r: 4 }],
    payment_terminal: [{ kind: 'rect', x: -23, y: I - 121, w: 20, h: 26, r: 2 }],
    rfid_reader: [{ kind: 'rect', x: 6, y: I - 117, w: 15, h: 15, r: 2 }],
    socket: [{ kind: 'rect', x: -20, y: I - 82, w: 14, h: 14, r: 7 }],
    emergency_stop: [{ kind: 'rect', x: 7, y: I - 82, w: 13, h: 13, r: 2 }],
    holster: [{ kind: 'rect', x: 30, y: I - hy - 9, w: 14, h: 22, r: 2 }],
    connector: [{ kind: 'rect', x: 32, y: I - hy - 33, w: 10, h: 26, r: 4 }],
    cable: [
      {
        kind: 'path',
        stroke: 6,
        d: arm
          ? `M90 ${I - 218} C 95 ${I - 150}, 70 ${I - 70}, 37 ${I - hy + 6}`
          : `M30 ${I - 35} C 70 ${I + 6}, 75 ${I - 60}, 37 ${I - hy + 6}`,
      },
    ],
    ...(arm
      ? {
          cable_management: [
            { kind: 'rect', x: 20, y: I - 235, w: 7, h: 45 },
            { kind: 'rect', x: 20, y: I - 235, w: 76, h: 7 },
            { kind: 'rect', x: 83, y: I - 230, w: 14, h: 14, r: 2 },
          ] as Shape[],
        }
      : {}),
    bollards: [
      { kind: 'rect', x: -88, y: I - 90, w: 16, h: 90, r: 7 },
      { kind: 'rect', x: 72, y: I - 90, w: 16, h: 90, r: 7 },
    ],
    kerb: [{ kind: 'rect', x: -130, y: I, w: 260, h: 12 }],
    bay_space: [{ kind: 'rect', x: -100, y: G + 6, w: 200, h: 14 }],
    bay_surface: [{ kind: 'rect', x: -160, y: G + 24, w: 320, h: 14 }],
  };
}

export function Elevation2D(props: ChargerModelProps & { label: string }) {
  const all = shapes(props.variant);
  const ids = Object.keys(all) as ComponentId[];
  const key = (id: ComponentId) => (e: KeyboardEvent) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      props.onSelect(id);
    }
  };
  return (
    <svg viewBox="-170 -20 340 370" className="h-full w-full" role="group" aria-label={props.label}>
      <rect x="-170" y="-20" width="340" height="370" fill="#f5eed3" />
      {/* pedestal */}
      <rect x="-30" y={288 - 190} width="60" height="190" rx="6" fill="#eef0f2" stroke="#8c9298" />
      <rect x="-110" y="276" width="220" height="12" fill="#cdc8bb" />
      <text x="-165" y="345" fontSize="8" fill="#4a4740">
        Front elevation. Bay surface and space shown as strips below.
      </text>
      {ids.map((id) => {
        const cell = props.heat[id];
        const level = cell?.level ?? 0;
        const fill = HEAT_COLOURS[level];
        const active = props.selected === id || props.hovered === id;
        const first = all[id]![0];
        // Badge centred on the part, so badges never collide with neighbours.
        const bw = (cell?.display.length ?? 1) * 5 + 8;
        const cx = first.kind === 'rect' ? first.x + first.w / 2 : props.variant === 'gen1' ? 66 : 82;
        const cy = first.kind === 'rect' ? first.y + first.h / 2 : props.variant === 'gen1' ? 250 : 150;
        return (
          <g
            key={id}
            role="button"
            tabIndex={0}
            aria-pressed={props.selected === id}
            aria-label={`${TAXONOMY[id].label}: ${cell?.display ?? 0}, ${HEAT_LABELS[level]}`}
            onClick={() => props.onSelect(id)}
            onKeyDown={key(id)}
            onMouseEnter={() => props.onHover(id)}
            onMouseLeave={() => props.onHover(null)}
            onFocus={() => props.onHover(id)}
            onBlur={() => props.onHover(null)}
            className="cursor-pointer outline-none"
          >
            {all[id]!.map((s, i) =>
              s.kind === 'rect' ? (
                <rect
                  key={i}
                  x={s.x}
                  y={s.y}
                  width={s.w}
                  height={s.h}
                  rx={s.r ?? 0}
                  fill={fill}
                  stroke="#1f1f1f"
                  strokeWidth={active ? 2 : 0.6}
                />
              ) : (
                <g key={i}>
                  <path d={s.d} fill="none" stroke="#1f1f1f" strokeWidth={s.stroke + (active ? 3 : 1.2)} strokeLinecap="round" />
                  <path d={s.d} fill="none" stroke={fill} strokeWidth={s.stroke} strokeLinecap="round" />
                </g>
              ),
            )}
            {cell && cell.value > 0 && (
              <g transform={`translate(${cx - bw / 2} ${cy})`} aria-hidden="true" pointerEvents="none">
                <rect x={0} y={-6} width={bw} height={11} rx={5.5} fill={fill} stroke="#1f1f1f" strokeWidth={0.8} />
                <text x={bw / 2} y={2.5} fontSize={7.5} fontWeight={700} fill="#1f1f1f" textAnchor="middle">
                  {cell.display}
                </text>
              </g>
            )}
            {active && (
              <text x={-165} y={-6} fontSize={9} fontWeight={700} fill="#1f1f1f" aria-hidden="true">
                {TAXONOMY[id].label}: {cell?.display ?? 0} ({HEAT_LABELS[level]})
              </text>
            )}
          </g>
        );
      })}
    </svg>
  );
}

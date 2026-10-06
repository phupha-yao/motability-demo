import { createContext, useContext, useMemo, type ReactNode, type RefObject } from 'react';
import { Edges, Html } from '@react-three/drei';
import * as THREE from 'three';
import type { ThreeEvent } from '@react-three/fiber';
import { TAXONOMY, type ComponentId } from '../data/taxonomy';
import { HEAT_COLOURS, HEAT_LABELS, type HeatLevel } from './analytics';

export type ModelVariant = 'gen1' | 'gen1-modified' | 'gen2';

export interface HeatCell {
  value: number;
  level: HeatLevel;
  /** Text shown in the badge, e.g. "56" or "0.42". */
  display: string;
}

export interface ChargerModelProps {
  variant: ModelVariant;
  heat: Partial<Record<ComponentId, HeatCell>>;
  selected: ComponentId | null;
  hovered: ComponentId | null;
  pulse?: ComponentId | null;
  onHover: (id: ComponentId | null) => void;
  onSelect: (id: ComponentId) => void;
  showBadges?: boolean;
  /** DOM node the floating badges render into (kept outside the canvas so unmounting is clean). */
  badgeLayer?: RefObject<HTMLDivElement | null>;
}

// Heights in metres. The island the charger stands on is 0.12 m above the bay.
const ISLAND = 0.12;
const holsterY = (v: ModelVariant) => (v === 'gen1' ? 1.42 : 0.95);

/** Where each component's badge floats, also used to aim the camera. */
export function anchors(v: ModelVariant): Partial<Record<ComponentId, [number, number, number]>> {
  const hy = holsterY(v);
  return {
    signage: [0, ISLAND + 1.86, 0.25],
    screen: [-0.05, ISLAND + 1.5, 0.3],
    buttons: [0.2, ISLAND + 1.24, 0.3],
    payment_terminal: [-0.3, ISLAND + 1.06, 0.3],
    rfid_reader: [0.24, ISLAND + 1.06, 0.3],
    socket: [-0.3, ISLAND + 0.74, 0.3],
    emergency_stop: [0.24, ISLAND + 0.74, 0.3],
    holster: [0.55, ISLAND + hy - 0.05, 0.12],
    connector: [0.55, ISLAND + hy + 0.22, -0.05],
    cable: v === 'gen1' ? [0.72, ISLAND + 0.45, 0.25] : [0.95, ISLAND + 1.5, 0.05],
    cable_management: [0.75, ISLAND + 2.45, 0],
    bollards: [-0.8, ISLAND + 1.05, 0.45],
    kerb: [-0.55, 0.2, 0.68],
    bay_surface: [-1.2, 0.05, 3.3],
    bay_space: [0.2, 0.05, 1.4],
    lighting: [-1.45, 3.2, -0.4],
  };
}

interface PartCtx {
  colour: string;
  active: boolean;
}
const PartContext = createContext<PartCtx>({ colour: '#d9d4c4', active: false });

function Mat({ fixed }: { fixed?: string }) {
  const { colour, active } = useContext(PartContext);
  return (
    <meshStandardMaterial
      color={fixed ?? colour}
      roughness={0.55}
      metalness={0.05}
      // A little self-light keeps the heat colours true under shading.
      emissive={fixed ?? colour}
      emissiveIntensity={active ? 0.45 : 0.28}
    />
  );
}

function Outline() {
  const { active } = useContext(PartContext);
  return active ? <Edges threshold={20} color="#1f1f1f" lineWidth={2} /> : null;
}

type MeshProps = { position?: [number, number, number]; rotation?: [number, number, number]; children: ReactNode; fixed?: string };
function Piece({ position, rotation, children, fixed }: MeshProps) {
  return (
    <mesh position={position} rotation={rotation} castShadow receiveShadow>
      {children}
      <Mat fixed={fixed} />
      <Outline />
    </mesh>
  );
}

function Part({
  id,
  props,
  children,
  badgeAt,
}: {
  id: ComponentId;
  props: ChargerModelProps;
  children: ReactNode;
  badgeAt?: [number, number, number];
}) {
  const cell = props.heat[id];
  const level = cell?.level ?? 0;
  const active = props.hovered === id || props.selected === id;
  const stop = (fn: () => void) => (e: ThreeEvent<PointerEvent | MouseEvent>) => {
    e.stopPropagation();
    fn();
  };
  return (
    <PartContext.Provider value={{ colour: HEAT_COLOURS[level], active }}>
      <group
        name={id}
        onPointerOver={stop(() => props.onHover(id))}
        onPointerOut={stop(() => props.onHover(null))}
        onClick={stop(() => props.onSelect(id))}
      >
        {children}
      </group>
      {props.showBadges !== false && cell && cell.value > 0 && badgeAt && (
        <Html position={badgeAt} center zIndexRange={[20, 0]} portal={props.badgeLayer as RefObject<HTMLElement>}>
          <button
            type="button"
            tabIndex={-1}
            aria-hidden="true"
            onClick={() => props.onSelect(id)}
            onMouseEnter={() => props.onHover(id)}
            onMouseLeave={() => props.onHover(null)}
            className={`pointer-events-auto flex items-center gap-1 whitespace-nowrap rounded-full border-2 px-2 py-0.5 text-xs font-semibold text-ink shadow ${
              props.selected === id ? 'border-ink' : 'border-ink/30'
            } ${props.pulse === id ? 'pulse' : ''}`}
            style={{ background: HEAT_COLOURS[level] }}
          >
            <span className="tabular-nums">{cell.display}</span>
            {(active || props.pulse === id) && <span className="font-normal">{TAXONOMY[id].label}, {HEAT_LABELS[level]}</span>}
          </button>
        </Html>
      )}
    </PartContext.Provider>
  );
}

function CableTube({ points, radius = 0.028 }: { points: [number, number, number][]; radius?: number }) {
  const geom = useMemo(() => {
    const curve = new THREE.CatmullRomCurve3(points.map((p) => new THREE.Vector3(...p)));
    return new THREE.TubeGeometry(curve, 64, radius, 12, false);
  }, [points, radius]);
  return (
    <mesh geometry={geom} castShadow>
      <Mat />
      <Outline />
    </mesh>
  );
}

export function ChargerModel(props: ChargerModelProps) {
  const v = props.variant;
  const a = anchors(v);
  const hy = ISLAND + holsterY(v);
  const hasArm = v !== 'gen1';
  const cablePoints: [number, number, number][] = hasArm
    ? [
        [0.9, ISLAND + 2.18, 0],
        [0.92, ISLAND + 1.7, 0.04],
        [0.78, ISLAND + 1.1, 0.12],
        [0.6, hy - 0.25, 0.1],
        [0.42, hy - 0.08, 0.02],
      ]
    : [
        [0.3, ISLAND + 0.35, -0.05],
        [0.5, ISLAND + 0.12, 0.15],
        [0.68, ISLAND + 0.25, 0.25],
        [0.62, ISLAND + 0.9, 0.12],
        [0.42, hy - 0.08, 0.02],
      ];

  return (
    <group>
      {/* Pedestal body: neutral, not a reportable component */}
      <mesh position={[0, ISLAND + 0.95, 0]} castShadow receiveShadow>
        <boxGeometry args={[0.6, 1.9, 0.35]} />
        <meshStandardMaterial color="#eef0f2" roughness={0.6} />
      </mesh>
      <mesh position={[0, ISLAND + 0.03, 0]}>
        <boxGeometry args={[0.66, 0.06, 0.4]} />
        <meshStandardMaterial color="#7e8389" />
      </mesh>
      {/* Island the charger stands on */}
      <mesh position={[0, ISLAND / 2, 0]} receiveShadow>
        <boxGeometry args={[2.2, ISLAND, 1.1]} />
        <meshStandardMaterial color="#cdc8bb" roughness={0.9} />
      </mesh>

      <Part id="signage" props={props} badgeAt={a.signage}>
        <Piece position={[0, ISLAND + 1.8, 0.18]}>
          <boxGeometry args={[0.52, 0.14, 0.02]} />
        </Piece>
      </Part>
      <Part id="screen" props={props} badgeAt={a.screen}>
        <Piece position={[0, ISLAND + 1.5, 0.185]}>
          <boxGeometry args={[0.4, 0.3, 0.03]} />
        </Piece>
      </Part>
      <Part id="buttons" props={props} badgeAt={a.buttons}>
        {[-0.08, 0.08].map((x) => (
          <Piece key={x} position={[x, ISLAND + 1.27, 0.19]} rotation={[Math.PI / 2, 0, 0]}>
            <cylinderGeometry args={[0.035, 0.035, 0.03, 20]} />
          </Piece>
        ))}
      </Part>
      <Part id="payment_terminal" props={props} badgeAt={a.payment_terminal}>
        <Piece position={[-0.13, ISLAND + 1.08, 0.19]}>
          <boxGeometry args={[0.2, 0.26, 0.05]} />
        </Piece>
      </Part>
      <Part id="rfid_reader" props={props} badgeAt={a.rfid_reader}>
        <Piece position={[0.14, ISLAND + 1.1, 0.185]}>
          <boxGeometry args={[0.15, 0.15, 0.03]} />
        </Piece>
      </Part>
      <Part id="socket" props={props} badgeAt={a.socket}>
        <Piece position={[-0.13, ISLAND + 0.75, 0.19]} rotation={[Math.PI / 2, 0, 0]}>
          <cylinderGeometry args={[0.07, 0.07, 0.05, 24]} />
        </Piece>
      </Part>
      <Part id="emergency_stop" props={props} badgeAt={a.emergency_stop}>
        <Piece position={[0.14, ISLAND + 0.75, 0.18]}>
          <boxGeometry args={[0.13, 0.13, 0.02]} />
        </Piece>
        <Piece position={[0.14, ISLAND + 0.75, 0.21]} rotation={[Math.PI / 2, 0, 0]}>
          <cylinderGeometry args={[0.045, 0.045, 0.05, 20]} />
        </Piece>
      </Part>

      <Part id="holster" props={props} badgeAt={a.holster}>
        <Piece position={[0.37, hy - 0.02, 0.02]}>
          <boxGeometry args={[0.14, 0.22, 0.16]} />
        </Piece>
      </Part>
      <Part id="connector" props={props} badgeAt={a.connector}>
        <Piece position={[0.42, hy + 0.12, 0.02]}>
          <boxGeometry args={[0.09, 0.26, 0.1]} />
        </Piece>
        <Piece position={[0.42, hy + 0.27, 0.02]} rotation={[0, 0, Math.PI / 2]}>
          <cylinderGeometry args={[0.045, 0.045, 0.09, 16]} />
        </Piece>
      </Part>
      <Part id="cable" props={props} badgeAt={a.cable}>
        <CableTube points={cablePoints} />
      </Part>
      {hasArm && (
        <Part id="cable_management" props={props} badgeAt={a.cable_management}>
          <Piece position={[0.24, ISLAND + 2.1, 0]}>
            <boxGeometry args={[0.07, 0.42, 0.07]} />
          </Piece>
          <Piece position={[0.58, ISLAND + 2.3, 0]}>
            <boxGeometry args={[0.76, 0.07, 0.07]} />
          </Piece>
          <Piece position={[0.9, ISLAND + 2.22, 0]}>
            <boxGeometry args={[0.14, 0.14, 0.14]} />
          </Piece>
        </Part>
      )}

      <Part id="bollards" props={props} badgeAt={a.bollards}>
        {[-0.8, 0.8].map((x) => (
          <Piece key={x} position={[x, ISLAND + 0.45, 0.4]}>
            <cylinderGeometry args={[0.08, 0.08, 0.9, 20]} />
          </Piece>
        ))}
      </Part>
      <Part id="kerb" props={props} badgeAt={a.kerb}>
        <Piece position={[0, ISLAND / 2, 0.6]}>
          <boxGeometry args={[2.4, ISLAND, 0.12]} />
        </Piece>
      </Part>
      <Part id="bay_surface" props={props} badgeAt={a.bay_surface}>
        <Piece position={[0, -0.01, 3.2]}>
          <boxGeometry args={[3.2, 0.02, 5.1]} />
        </Piece>
      </Part>
      <Part id="bay_space" props={props} badgeAt={a.bay_space}>
        <Piece position={[0, 0.005, 1.35]}>
          <boxGeometry args={[2.0, 0.012, 1.3]} />
        </Piece>
      </Part>
      <Part id="lighting" props={props} badgeAt={a.lighting}>
        <Piece position={[-1.45, 1.5, -0.4]} fixed="#6b7178">
          <cylinderGeometry args={[0.05, 0.06, 3.0, 12]} />
        </Piece>
        <Piece position={[-1.2, 3.0, -0.4]}>
          <boxGeometry args={[0.6, 0.08, 0.22]} />
        </Piece>
      </Part>
    </group>
  );
}

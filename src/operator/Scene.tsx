import { Component, useEffect, useRef, useState, type ReactNode } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { OrbitControls } from '@react-three/drei';
import * as THREE from 'three';
import { ChargerModel, type ChargerModelProps } from './ChargerModel';

export type CameraPreset = 'front' | 'side' | 'wheelchair' | 'top';

export const CAMERA_PRESETS: { id: CameraPreset; label: string }[] = [
  { id: 'front', label: 'Front' },
  { id: 'side', label: 'Side' },
  { id: 'wheelchair', label: 'Eye height from a wheelchair (1.1 m)' },
  { id: 'top', label: 'Top' },
];

const PRESETS: Record<CameraPreset, { pos: [number, number, number]; target: [number, number, number] }> = {
  front: { pos: [0.7, 1.7, 4.4], target: [0.2, 1.2, 0.3] },
  side: { pos: [4.0, 1.5, 1.0], target: [0.2, 1.2, 0.2] },
  wheelchair: { pos: [0.9, 1.1, 2.7], target: [0.2, 1.25, 0] },
  top: { pos: [0.01, 6, 1.6], target: [0, 0, 1.2] },
};

export const prefersReducedMotion = () =>
  typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;

function CameraRig({ preset, nonce }: { preset: CameraPreset; nonce: number }) {
  const { camera, controls } = useThree() as unknown as {
    camera: THREE.PerspectiveCamera;
    controls: { target: THREE.Vector3; update: () => void } | null;
  };
  const goal = useRef<{ pos: THREE.Vector3; target: THREE.Vector3 } | null>(null);

  useEffect(() => {
    const p = PRESETS[preset];
    const pos = new THREE.Vector3(...p.pos);
    const target = new THREE.Vector3(...p.target);
    if (prefersReducedMotion() || !controls) {
      camera.position.copy(pos);
      controls?.target.copy(target);
      controls?.update();
      if (!controls) camera.lookAt(target);
      goal.current = null;
    } else goal.current = { pos, target };
  }, [preset, nonce, camera, controls]);

  useFrame((_, dt) => {
    const g = goal.current;
    if (!g || !controls) return;
    const k = 1 - Math.pow(0.002, dt);
    camera.position.lerp(g.pos, k);
    controls.target.lerp(g.target, k);
    controls.update();
    if (camera.position.distanceTo(g.pos) < 0.01) goal.current = null;
  });
  return null;
}

class GLBoundary extends Component<{ fallback: ReactNode; children: ReactNode }, { failed: boolean }> {
  state = { failed: false };
  static getDerivedStateFromError() {
    return { failed: true };
  }
  render() {
    return this.state.failed ? this.props.fallback : this.props.children;
  }
}

export function webglAvailable() {
  try {
    const c = document.createElement('canvas');
    return !!(c.getContext('webgl2') || c.getContext('webgl'));
  } catch {
    return false;
  }
}

export function Scene({
  model,
  preset,
  presetNonce = 0,
  label,
  fallback,
}: {
  model: ChargerModelProps;
  preset: CameraPreset;
  presetNonce?: number;
  label: string;
  fallback: ReactNode;
}) {
  const badgeLayer = useRef<HTMLDivElement>(null);
  const [layerReady, setLayerReady] = useState(false);
  useEffect(() => setLayerReady(true), []);
  return (
    <GLBoundary fallback={fallback}>
      <div className="relative h-full w-full" role="img" aria-label={label}>
        <Canvas
          flat
          shadows
          dpr={[1, 2]}
          camera={{ position: PRESETS[preset].pos, fov: 40, near: 0.05, far: 60 }}
          onPointerMissed={() => model.onHover(null)}
        >
          <color attach="background" args={['#f5eed3']} />
          <ambientLight intensity={0.9} />
          <hemisphereLight args={['#fffbec', '#d9d4c4', 0.6]} />
          <directionalLight position={[2.5, 5, 5]} intensity={1.1} castShadow shadow-mapSize={[1024, 1024]} />
          {layerReady && <ChargerModel {...model} badgeLayer={badgeLayer} />}
          <OrbitControls
            makeDefault
            target={PRESETS[preset].target}
            enablePan
            minDistance={0.8}
            maxDistance={9}
            maxPolarAngle={Math.PI / 2 - 0.03}
            enableDamping={!prefersReducedMotion()}
          />
          <CameraRig preset={preset} nonce={presetNonce} />
        </Canvas>
        <div ref={badgeLayer} className="pointer-events-none absolute inset-0 overflow-hidden" />
      </div>
    </GLBoundary>
  );
}

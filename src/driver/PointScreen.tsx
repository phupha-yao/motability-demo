import { useEffect, useRef, useState, type PointerEvent as RPointerEvent } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import { PHOTOS } from '../data/photos';
import { TAXONOMY } from '../data/taxonomy';
import { segmenter } from '../segmentation/mockSegmenter';
import type { Pt } from '../segmentation/geometry';
import type { Prompt } from '../segmentation/types';
import { useDraft } from '../store/draft';
import { CicelyLayout, SecondaryButton } from './ui';

type Mode = 'tap' | 'lasso';
interface View {
  x: number;
  y: number;
  w: number;
  h: number;
}

const clamp = (v: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, v));

export function PointScreen() {
  const navigate = useNavigate();
  const { photoId, update } = useDraft();
  const photo = photoId ? PHOTOS[photoId] : undefined;
  const [mode, setMode] = useState<Mode>('tap');
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  const [marker, setMarker] = useState<Pt | null>(null);
  const [lasso, setLassoState] = useState<Pt[]>([]);
  const lassoRef = useRef<Pt[]>([]);
  const setLasso = (pts: Pt[]) => {
    lassoRef.current = pts;
    setLassoState(pts);
  };
  const W = photo?.width ?? 600;
  const H = photo?.height ?? 800;
  const [view, setView] = useState<View>({ x: 0, y: 0, w: W, h: H });
  const svgRef = useRef<SVGSVGElement>(null);
  const pointers = useRef(new Map<number, { x: number; y: number }>());
  const gesture = useRef<{
    startClient: { x: number; y: number };
    moved: number;
    pinched: boolean;
    pinch?: { d0: number; view0: View; mid: Pt };
    panView?: View;
  } | null>(null);

  useEffect(() => setView({ x: 0, y: 0, w: W, h: H }), [W, H]);

  if (!photo) return <Navigate to="/driver/cicely/photo" replace />;

  const toImage = (clientX: number, clientY: number): Pt => {
    const svg = svgRef.current!;
    const pt = svg.createSVGPoint();
    pt.x = clientX;
    pt.y = clientY;
    const p = pt.matrixTransform(svg.getScreenCTM()!.inverse());
    return [p.x, p.y];
  };

  const constrain = (v: View): View => {
    const w = clamp(v.w, W / 4, W);
    const h = (w * H) / W;
    return { w, h, x: clamp(v.x, 0, W - w), y: clamp(v.y, 0, H - h) };
  };

  const zoomBy = (factor: number, centre: Pt = [view.x + view.w / 2, view.y + view.h / 2]) => {
    setView((v) => {
      const w = v.w / factor;
      return constrain({ w, h: 0, x: centre[0] - ((centre[0] - v.x) * w) / v.w, y: centre[1] - ((centre[1] - v.y) * w) / v.w });
    });
  };

  const run = async (prompt: Prompt) => {
    setBusy(true);
    setMessage('');
    const result = await segmenter.segment(photo.id, prompt);
    setBusy(false);
    if (!result) {
      setMarker(null);
      setLasso([]);
      setMessage("We couldn't find a part there. Try again, or choose from a list.");
      return;
    }
    update({ segmentation: result, segmentationPrompt: prompt.kind, componentId: result.componentId, componentConfirmed: false });
    navigate('/driver/cicely/part');
  };

  const onDown = (e: RPointerEvent<SVGSVGElement>) => {
    if (busy) return;
    (e.target as Element).setPointerCapture?.(e.pointerId);
    pointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
    if (pointers.current.size === 1) {
      gesture.current = { startClient: { x: e.clientX, y: e.clientY }, moved: 0, pinched: false, panView: view };
      if (mode === 'lasso') setLasso([toImage(e.clientX, e.clientY)]);
    } else if (pointers.current.size === 2 && gesture.current) {
      const [a, b] = [...pointers.current.values()];
      gesture.current.pinched = true;
      gesture.current.pinch = {
        d0: Math.hypot(a.x - b.x, a.y - b.y),
        view0: view,
        mid: toImage((a.x + b.x) / 2, (a.y + b.y) / 2),
      };
      setLasso([]);
    }
  };

  const onMove = (e: RPointerEvent<SVGSVGElement>) => {
    const g = gesture.current;
    if (!g || !pointers.current.has(e.pointerId)) return;
    pointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
    g.moved = Math.max(g.moved, Math.hypot(e.clientX - g.startClient.x, e.clientY - g.startClient.y));

    if (pointers.current.size === 2 && g.pinch) {
      const [a, b] = [...pointers.current.values()];
      const d = Math.hypot(a.x - b.x, a.y - b.y) || 1;
      const { view0, mid, d0 } = g.pinch;
      const w = (view0.w * d0) / d;
      setView(constrain({ w, h: 0, x: mid[0] - ((mid[0] - view0.x) * w) / view0.w, y: mid[1] - ((mid[1] - view0.y) * w) / view0.w }));
      return;
    }
    if (g.pinched) return;
    if (mode === 'lasso') {
      const p = toImage(e.clientX, e.clientY);
      const l = lassoRef.current;
      if (!l.length || Math.hypot(l[l.length - 1][0] - p[0], l[l.length - 1][1] - p[1]) >= 3) setLasso([...l, p]);
    } else if (view.w < W && g.panView && g.moved > 8) {
      // Pan when zoomed in.
      const scale = g.panView.w / svgRef.current!.getBoundingClientRect().width;
      setView(
        constrain({
          ...g.panView,
          x: g.panView.x - (e.clientX - g.startClient.x) * scale,
          y: g.panView.y - (e.clientY - g.startClient.y) * scale,
        }),
      );
    }
  };

  const onUp = (e: RPointerEvent<SVGSVGElement>) => {
    const g = gesture.current;
    pointers.current.delete(e.pointerId);
    if (pointers.current.size > 0 || !g) return;
    gesture.current = null;
    if (g.pinched || busy) return;
    if (mode === 'tap' && g.moved < 8) {
      const p = toImage(e.clientX, e.clientY);
      setMarker(p);
      void run({ kind: 'tap', x: p[0], y: p[1] });
    } else if (mode === 'lasso') {
      const l = lassoRef.current;
      if (l.length >= 6) void run({ kind: 'lasso', points: l });
      else setMessage('Draw a loop all the way round the part.');
    }
  };

  const zoomed = view.w < W - 1;

  return (
    <CicelyLayout
      step={3}
      title={mode === 'tap' ? 'Tap the part that was a problem' : 'Draw round the part that was a problem'}
      footer={
        <SecondaryButton onClick={() => navigate('/driver/cicely/list')}>Can't point? Choose from a list instead</SecondaryButton>
      }
    >
      <div role="radiogroup" aria-label="How do you want to point?" className="mb-3 grid grid-cols-2 gap-1 rounded-2xl bg-ink/10 p-1">
        {(['tap', 'lasso'] as Mode[]).map((m) => (
          <button
            key={m}
            type="button"
            role="radio"
            aria-checked={mode === m}
            onClick={() => {
              setMode(m);
              setLasso([]);
              setMessage('');
            }}
            className={`min-h-14 rounded-xl font-heading text-base ${mode === m ? 'bg-ink text-cream' : 'text-ink'}`}
          >
            {m === 'tap' ? 'Tap it' : 'Draw round it'}
          </button>
        ))}
      </div>

      <div className="relative overflow-hidden rounded-3xl border-2 border-ink/20 bg-ink/5">
        <svg
          ref={svgRef}
          viewBox={`${view.x} ${view.y} ${view.w} ${view.h}`}
          className="block h-auto w-full touch-none select-none"
          style={{ cursor: mode === 'tap' ? (zoomed ? 'grab' : 'crosshair') : 'crosshair' }}
          role="img"
          aria-label={`${photo.alt}. ${mode === 'tap' ? 'Tap' : 'Draw round'} the part on the photo. If you can't, use the button below the photo to choose from a list.`}
          onPointerDown={onDown}
          onPointerMove={onMove}
          onPointerUp={onUp}
          onPointerCancel={onUp}
        >
          <image href={photo.src} width={W} height={H} />
          {lasso.length > 1 && (
            <polyline
              points={lasso.map((p) => p.join(',')).join(' ')}
              fill="rgba(255,113,153,0.2)"
              stroke="#1f1f1f"
              strokeWidth={3}
              strokeDasharray="8 6"
              vectorEffect="non-scaling-stroke"
            />
          )}
          {marker && (
            <g>
              <circle cx={marker[0]} cy={marker[1]} r={view.w / 30} fill="#ff7199" stroke="#1f1f1f" strokeWidth={3} vectorEffect="non-scaling-stroke" />
              <circle cx={marker[0]} cy={marker[1]} r={view.w / 90} fill="#1f1f1f" />
            </g>
          )}
        </svg>

        <div className="absolute right-2 top-2 flex flex-col gap-1">
          <button
            type="button"
            onClick={() => zoomBy(1.5)}
            className="flex h-14 w-14 items-center justify-center rounded-full bg-cream/95 text-2xl shadow"
            aria-label="Zoom in"
          >
            +
          </button>
          <button
            type="button"
            onClick={() => zoomBy(1 / 1.5)}
            disabled={!zoomed}
            className="flex h-14 w-14 items-center justify-center rounded-full bg-cream/95 text-2xl shadow disabled:opacity-40"
            aria-label="Zoom out"
          >
            −
          </button>
        </div>

        {busy && (
          <div role="status" className="absolute inset-x-0 bottom-0 flex items-center gap-3 bg-ink/85 px-4 py-3 text-cream">
            <span aria-hidden="true" className="spin inline-block h-5 w-5 rounded-full border-2 border-cream border-t-transparent" />
            Finding that part…
          </div>
        )}
      </div>

      <p className="mt-3 text-base text-ink-soft">
        {mode === 'tap'
          ? 'Tap once on the part. Pinch or use + to zoom in.'
          : 'Draw a loop round the part with your finger or mouse.'}
      </p>
      {message && (
        <p role="alert" className="mt-3 rounded-2xl bg-bubblegum p-3 font-semibold">
          {message}
        </p>
      )}
      <p className="sr-only">Parts that can be identified on this photo: {[...new Set(photo.masks.map((m) => TAXONOMY[m.componentId].label))].join(', ')}.</p>
    </CicelyLayout>
  );
}

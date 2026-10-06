import { useRef, useState, type PointerEvent as RPointerEvent } from 'react';
import { PHOTOS, type Mask } from '../data/photos';
import { COMPONENT_IDS, TAXONOMY, type ComponentId } from '../data/taxonomy';
import { toPoints, type Pt } from '../segmentation/geometry';

/**
 * Dev-only mask authoring. Load any image, pick a component, click to add points,
 * drag points to adjust, then export JSON for src/data/photos/<photoId>.masks.json.
 */
export default function MaskTool() {
  const [src, setSrc] = useState(PHOTOS['rapid-gen1'].src);
  const [size, setSize] = useState({ w: 600, h: 800 });
  const [masks, setMasks] = useState<Mask[]>(PHOTOS['rapid-gen1'].masks.map((m) => ({ ...m, polygon: m.polygon.map((p) => [...p] as Pt) })));
  const [active, setActive] = useState<number | null>(null);
  const [component, setComponent] = useState<ComponentId>('holster');
  const [drag, setDrag] = useState<{ mask: number; point: number } | null>(null);
  const [copied, setCopied] = useState(false);
  const [importText, setImportText] = useState('');
  const [importError, setImportError] = useState('');
  const svgRef = useRef<SVGSVGElement>(null);
  const json = JSON.stringify(masks, null, 2);

  const toImage = (e: { clientX: number; clientY: number }): Pt => {
    const pt = svgRef.current!.createSVGPoint();
    pt.x = e.clientX;
    pt.y = e.clientY;
    const p = pt.matrixTransform(svgRef.current!.getScreenCTM()!.inverse());
    return [Math.round(p.x), Math.round(p.y)];
  };

  const loadDemo = (id: string) => {
    const p = PHOTOS[id];
    setSrc(p.src);
    setSize({ w: p.width, h: p.height });
    setMasks(p.masks.map((m) => ({ ...m, polygon: m.polygon.map((q) => [...q] as Pt) })));
    setActive(null);
  };

  const onBackgroundClick = (e: RPointerEvent<SVGSVGElement>) => {
    if (drag || active === null) return;
    const p = toImage(e);
    setMasks((ms) => ms.map((m, i) => (i === active ? { ...m, polygon: [...m.polygon, p] } : m)));
  };

  const download = () => {
    const a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob([json], { type: 'application/json' }));
    a.download = 'photo.masks.json';
    a.click();
    URL.revokeObjectURL(a.href);
  };

  return (
    <div className="grid min-h-dvh gap-4 bg-cream p-4 text-ink lg:grid-cols-[1fr_380px]">
      <div>
        <h1 className="text-2xl">Mask authoring (dev only)</h1>
        <p className="text-sm text-ink-soft">
          Choose a polygon (or start a new one), click on the image to add points, drag points to move them. Shift-click a point to delete it.
        </p>
        <div className="my-3 flex flex-wrap items-center gap-2 text-sm">
          {Object.keys(PHOTOS).map((id) => (
            <button key={id} type="button" className="min-h-10 rounded-full border-2 border-ink px-3" onClick={() => loadDemo(id)}>
              Load {id}
            </button>
          ))}
          <label className="min-h-10 cursor-pointer rounded-full border-2 border-ink px-3 py-2">
            Load your own image
            <input
              type="file"
              accept="image/*"
              className="sr-only"
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (!f) return;
                const url = URL.createObjectURL(f);
                const img = new Image();
                img.onload = () => {
                  setSize({ w: img.naturalWidth, h: img.naturalHeight });
                  setSrc(url);
                  setMasks([]);
                  setActive(null);
                };
                img.src = url;
              }}
            />
          </label>
        </div>
        <svg
          ref={svgRef}
          viewBox={`0 0 ${size.w} ${size.h}`}
          className="max-h-[80vh] w-full touch-none select-none rounded-xl border border-ink/20 bg-white"
          onPointerUp={(e) => (drag ? setDrag(null) : onBackgroundClick(e))}
          onPointerMove={(e) => {
            if (!drag) return;
            const p = toImage(e);
            setMasks((ms) => ms.map((m, i) => (i === drag.mask ? { ...m, polygon: m.polygon.map((q, j) => (j === drag.point ? p : q)) } : m)));
          }}
        >
          <image href={src} width={size.w} height={size.h} />
          {masks.map((m, i) => (
            <g key={i}>
              <polygon
                points={toPoints(m.polygon)}
                fill={i === active ? 'rgba(255,113,153,0.35)' : 'rgba(137,216,255,0.2)'}
                stroke={i === active ? '#1f1f1f' : '#2e6d8e'}
                strokeWidth={i === active ? 3 : 1.5}
                onPointerDown={(e) => {
                  if (i !== active) {
                    e.stopPropagation();
                    setActive(i);
                  }
                }}
              />
              {i === active &&
                m.polygon.map((p, j) => (
                  <circle
                    key={j}
                    cx={p[0]}
                    cy={p[1]}
                    r={size.w / 90}
                    fill="#ffe96a"
                    stroke="#1f1f1f"
                    strokeWidth={2}
                    className="cursor-move"
                    onPointerDown={(e) => {
                      e.stopPropagation();
                      if (e.shiftKey) setMasks((ms) => ms.map((mm, k) => (k === i ? { ...mm, polygon: mm.polygon.filter((_, jj) => jj !== j) } : mm)));
                      else setDrag({ mask: i, point: j });
                    }}
                  />
                ))}
            </g>
          ))}
        </svg>
      </div>

      <aside className="space-y-4">
        <section>
          <h2 className="text-lg">New polygon</h2>
          <div className="mt-2 flex gap-2">
            <select className="min-h-10 flex-1 rounded-lg border border-ink/30 bg-white px-2" value={component} onChange={(e) => setComponent(e.target.value as ComponentId)}>
              {COMPONENT_IDS.map((id) => (
                <option key={id} value={id}>
                  {TAXONOMY[id].label} ({id})
                </option>
              ))}
            </select>
            <button
              type="button"
              className="min-h-10 rounded-full bg-ink px-4 text-cream"
              onClick={() => {
                setMasks((ms) => [...ms, { componentId: component, polygon: [] }]);
                setActive(masks.length);
              }}
            >
              Start
            </button>
          </div>
        </section>
        <section>
          <h2 className="text-lg">Polygons ({masks.length})</h2>
          <ul className="mt-2 max-h-72 space-y-1 overflow-y-auto text-sm">
            {masks.map((m, i) => (
              <li key={i} className={`flex items-center gap-2 rounded-lg px-2 ${i === active ? 'bg-dandelion' : ''}`}>
                <button type="button" className="min-h-9 flex-1 text-left" onClick={() => setActive(i)}>
                  {TAXONOMY[m.componentId].label} · {m.polygon.length} points
                </button>
                <button
                  type="button"
                  className="min-h-9 px-2 underline"
                  onClick={() => {
                    setMasks((ms) => ms.filter((_, k) => k !== i));
                    setActive(null);
                  }}
                >
                  Delete
                </button>
              </li>
            ))}
          </ul>
        </section>
        <section>
          <h2 className="text-lg">Export</h2>
          <div className="mt-2 flex gap-2">
            <button type="button" className="min-h-10 rounded-full bg-ink px-4 text-cream" onClick={download}>
              Download JSON
            </button>
            <button
              type="button"
              className="min-h-10 rounded-full border-2 border-ink px-4"
              onClick={async () => {
                await navigator.clipboard.writeText(json);
                setCopied(true);
              }}
            >
              {copied ? 'Copied' : 'Copy'}
            </button>
          </div>
          <pre className="mt-2 max-h-40 overflow-auto rounded-lg bg-white p-2 text-xs">{json}</pre>
          <label className="mt-3 block text-sm">
            Paste JSON to import
            <textarea
              className="mt-1 h-24 w-full rounded-lg border border-ink/30 bg-white p-2 font-mono text-xs"
              value={importText}
              onChange={(e) => setImportText(e.target.value)}
            />
          </label>
          <button
            type="button"
            className="mt-1 min-h-10 rounded-full border-2 border-ink px-4 text-sm"
            onClick={() => {
              try {
                setMasks(JSON.parse(importText));
                setImportError('');
              } catch {
                setImportError('That is not valid JSON.');
              }
            }}
          >
            Import
          </button>
          {importError && <p role="alert" className="text-sm text-[#9a1d3c]">{importError}</p>}
        </section>
      </aside>
    </div>
  );
}

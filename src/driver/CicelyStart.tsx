import { useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { CHARGERS, chargerById, siteById } from '../data/network';
import { maskFor, photoForGeneration } from '../data/photos';
import { COMPONENT_IDS, TAXONOMY, type ComponentId } from '../data/taxonomy';
import { useDraft } from '../store/draft';
import { CicelyLayout, PrimaryButton, SecondaryButton, TextButton } from './ui';

const IDENTIFIED_TEXT = {
  location: 'We matched this using your location.',
  qr: 'We matched this from the QR code you scanned.',
  asset_id: 'We matched this from the ID printed on the charger.',
  driver_confirmed: 'You chose this charger.',
} as const;

export function ConfirmCharger() {
  const navigate = useNavigate();
  const { chargerId, identifiedBy, update } = useDraft();
  const charger = chargerById(chargerId) ?? CHARGERS[0];
  const site = siteById(charger.siteId);
  const [choosing, setChoosing] = useState(false);
  const [assetId, setAssetId] = useState('');
  const [assetError, setAssetError] = useState('');

  const nearby = useMemo(
    () => [...CHARGERS].sort((a, b) => Number(b.siteId === charger.siteId) - Number(a.siteId === charger.siteId)).slice(0, 6),
    [charger.siteId],
  );

  if (choosing) {
    return (
      <CicelyLayout step={1} title="Which charger are you at?" onBack={() => setChoosing(false)}>
        <h2 className="mb-2 font-heading text-lg">Nearby chargers</h2>
        <ul className="space-y-2">
          {nearby.map((c) => (
            <li key={c.id}>
              <button
                type="button"
                onClick={() => {
                  update({ chargerId: c.id, identifiedBy: 'driver_confirmed' });
                  setChoosing(false);
                }}
                className="flex min-h-16 w-full flex-col justify-center rounded-2xl border-2 border-ink/25 bg-paper/60 px-4 py-2 text-left"
              >
                <span className="font-heading">
                  {c.name}, {siteById(c.siteId).name}
                </span>
                <span className="text-sm text-ink-soft">
                  {c.model}, {c.generation} · ID {c.assetId}
                </span>
              </button>
            </li>
          ))}
        </ul>
        <form
          className="mt-6"
          onSubmit={(e) => {
            e.preventDefault();
            const match = CHARGERS.find((c) => c.assetId.toLowerCase() === assetId.trim().toLowerCase());
            if (!match) {
              setAssetError('We could not find that ID. Check the sticker on the front of the charger, for example NW-EAL-03.');
              return;
            }
            update({ chargerId: match.id, identifiedBy: 'asset_id' });
            setChoosing(false);
          }}
        >
          <label htmlFor="asset" className="font-heading text-lg">
            Or type the ID printed on the charger
          </label>
          <input
            id="asset"
            value={assetId}
            onChange={(e) => setAssetId(e.target.value)}
            aria-describedby={assetError ? 'asset-err' : undefined}
            aria-invalid={!!assetError}
            placeholder="For example NW-EAL-03"
            className="mt-2 min-h-14 w-full rounded-2xl border-2 border-ink bg-paper px-4 text-lg uppercase"
          />
          {assetError && (
            <p id="asset-err" role="alert" className="mt-2 text-sm font-semibold text-[#9a1d3c]">
              {assetError}
            </p>
          )}
          <SecondaryButton type="submit" className="mt-3">
            Use this ID
          </SecondaryButton>
        </form>
      </CicelyLayout>
    );
  }

  return (
    <CicelyLayout
      step={1}
      title="Is this the right charger?"
      onBack={() => navigate(`/driver/site/${charger.siteId}`)}
      footer={
        <>
          <PrimaryButton onClick={() => navigate('/driver/cicely/photo')}>Yes, that's it</PrimaryButton>
          <SecondaryButton onClick={() => setChoosing(true)}>No, choose a different charger</SecondaryButton>
        </>
      }
    >
      <div className="rounded-3xl bg-sky/60 p-5">
        <p className="text-xl leading-snug">
          You're at <strong className="font-heading">{charger.name}</strong>, {charger.model}, {charger.generation}, at{' '}
          {site.name}.
        </p>
        <p className="mt-3 text-sm text-ink-soft">ID on the charger: {charger.assetId}</p>
      </div>
      <p className="mt-4 flex items-start gap-2 text-base">
        <span aria-hidden="true">📍</span>
        {IDENTIFIED_TEXT[identifiedBy]}
      </p>
      <p className="mt-4 text-base text-ink-soft">
        Next, you'll take a photo and point at the part that was a problem. It takes about a minute.
      </p>
    </CicelyLayout>
  );
}

/** Downscale a photo so it fits comfortably in localStorage for the demo. */
async function downscale(file: File, maxW = 600): Promise<string> {
  const url = URL.createObjectURL(file);
  try {
    const img = await new Promise<HTMLImageElement>((res, rej) => {
      const i = new Image();
      i.onload = () => res(i);
      i.onerror = rej;
      i.src = url;
    });
    const scale = Math.min(1, maxW / img.width);
    const canvas = document.createElement('canvas');
    canvas.width = Math.round(img.width * scale);
    canvas.height = Math.round(img.height * scale);
    canvas.getContext('2d')!.drawImage(img, 0, 0, canvas.width, canvas.height);
    return canvas.toDataURL('image/jpeg', 0.7);
  } finally {
    URL.revokeObjectURL(url);
  }
}

export function PhotoScreen() {
  const navigate = useNavigate();
  const { chargerId, update } = useDraft();
  const charger = chargerById(chargerId) ?? CHARGERS[0];
  const fileRef = useRef<HTMLInputElement>(null);
  const [error, setError] = useState('');
  const demo = photoForGeneration(charger.generation);

  return (
    <CicelyLayout
      step={2}
      title="Take a photo of the charger"
      footer={
        <>
          <PrimaryButton
            onClick={() => {
              update({ photoId: demo.id, photoDataUrl: undefined, segmentation: undefined, componentId: undefined });
              navigate('/driver/cicely/point');
            }}
          >
            Use demo photo
          </PrimaryButton>
          <SecondaryButton onClick={() => fileRef.current?.click()}>
            <span aria-hidden="true">📷</span> Take or choose a photo
          </SecondaryButton>
          <input
            ref={fileRef}
            type="file"
            accept="image/*"
            capture="environment"
            className="sr-only"
            tabIndex={-1}
            aria-hidden="true"
            onChange={async (e) => {
              const file = e.target.files?.[0];
              if (!file) return;
              try {
                const dataUrl = await downscale(file);
                update({ photoId: undefined, photoDataUrl: dataUrl, segmentation: undefined, componentId: undefined });
                navigate('/driver/cicely/list?own=1');
              } catch {
                setError('That photo could not be opened. Try another, or use the demo photo.');
              }
            }}
          />
        </>
      }
    >
      <p className="text-lg leading-relaxed">
        Get the part that was a problem in the picture. You don't need to know what it's called.
      </p>
      <div className="mt-4 overflow-hidden rounded-3xl border-2 border-ink/15">
        <img src={demo.src} alt={demo.alt} className="block aspect-[3/4] w-full object-cover" />
      </div>
      <p className="mt-2 text-sm text-ink-soft">Demo photo of a {charger.generation} charger like this one.</p>
      {error && (
        <p role="alert" className="mt-3 font-semibold text-[#9a1d3c]">
          {error}
        </p>
      )}
    </CicelyLayout>
  );
}

const LIST_GROUPS: { title: string; ids: ComponentId[] }[] = [
  { title: 'On the charger', ids: ['screen', 'payment_terminal', 'rfid_reader', 'buttons', 'emergency_stop', 'signage'] },
  { title: 'Cable and plug', ids: ['connector', 'holster', 'cable', 'cable_management', 'socket'] },
  { title: 'Around the bay', ids: ['bay_space', 'kerb', 'bay_surface', 'bollards', 'lighting'] },
];

export function ListPicker() {
  const navigate = useNavigate();
  const { photoId, photoDataUrl, update } = useDraft();
  const own = !photoId && !!photoDataUrl;
  const [q, setQ] = useState('');
  const query = q.trim().toLowerCase();
  const matches = (id: ComponentId) => {
    if (!query) return true;
    const t = TAXONOMY[id];
    return [t.label, ...t.alsoCalled, t.description].some((s) => s.toLowerCase().includes(query));
  };
  const anyMatch = COMPONENT_IDS.some(matches);

  const choose = (id: ComponentId) => {
    const mask = maskFor(photoId, id);
    update({
      componentId: id,
      componentConfirmed: true,
      segmentationPrompt: 'list',
      segmentation: mask ? { componentId: id, polygon: mask.polygon, confidence: 1, alternatives: [] } : undefined,
    });
    navigate('/driver/cicely/what');
  };

  return (
    <CicelyLayout step={3} title="Which part was the problem?">
      {own && (
        <div className="mb-4 rounded-2xl bg-dandelion p-4 text-base">
          <p className="font-heading">Your photo is saved with the report.</p>
          <p className="mt-1 text-sm">
            In this demo we can only outline parts on the demo photos, so please choose the part from the list.
          </p>
        </div>
      )}
      <label htmlFor="part-search" className="block font-heading">
        Search, or choose below
      </label>
      <input
        id="part-search"
        type="search"
        value={q}
        onChange={(e) => setQ(e.target.value)}
        placeholder="For example plug, screen, kerb"
        className="mt-2 min-h-14 w-full rounded-2xl border-2 border-ink bg-paper px-4 text-lg"
      />
      {LIST_GROUPS.map((g) => {
        const ids = g.ids.filter(matches);
        if (!ids.length) return null;
        return (
          <section key={g.title} className="mt-5">
            <h2 className="mb-2 font-heading text-lg">{g.title}</h2>
            <ul className="space-y-2">
              {ids.map((id) => (
                <li key={id}>
                  <button
                    type="button"
                    onClick={() => choose(id)}
                    className="flex min-h-16 w-full flex-col justify-center rounded-2xl border-2 border-ink/25 bg-paper/60 px-4 py-2 text-left hover:border-ink"
                  >
                    <span className="font-heading text-base">{TAXONOMY[id].label}</span>
                    <span className="text-sm text-ink-soft">{TAXONOMY[id].description}</span>
                  </button>
                </li>
              ))}
            </ul>
          </section>
        );
      })}
      {!anyMatch && (
        <p role="status" className="mt-4">
          Nothing matches "{q}". Try another word, or show all parts.
        </p>
      )}
      <TextButton className="mt-4" onClick={() => setQ('')}>
        Show all parts
      </TextButton>
    </CicelyLayout>
  );
}

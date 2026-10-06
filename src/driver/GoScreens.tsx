import { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { CHARGERS, SITES, siteById } from '../data/network';
import type { EntryPoint } from '../data/types';
import { useDraft } from '../store/draft';
import { GoShell } from './GoShell';

const availability: Record<string, number> = { ealing: 2, lewisham: 1, stratford: 3, brixton: 2, ashby: 2 };

export function MapScreen() {
  const navigate = useNavigate();
  const [view, setView] = useState<'map' | 'list'>('map');

  return (
    <GoShell title="Find a charger">
      <div className="space-y-3 p-4">
        <label className="block">
          <span className="sr-only">Search for a place</span>
          <input
            className="min-h-12 w-full rounded-xl border border-go-ink/20 bg-white px-4 text-base"
            placeholder="Search for a place"
            defaultValue="London"
          />
        </label>
        <ul className="flex flex-wrap gap-2" aria-label="Active filters">
          {['CCS', 'Rapid 50 kW+', 'Available now'].map((f) => (
            <li key={f} className="rounded-full bg-go-blue/10 px-3 py-1.5 text-sm font-semibold text-go-blue">
              {f}
            </li>
          ))}
        </ul>
        <div role="radiogroup" aria-label="Show as" className="grid grid-cols-2 rounded-xl bg-white p-1">
          {(['map', 'list'] as const).map((v) => (
            <button
              key={v}
              type="button"
              role="radio"
              aria-checked={view === v}
              onClick={() => setView(v)}
              className={`min-h-12 rounded-lg font-semibold ${view === v ? 'bg-go-blue text-white' : 'text-go-ink'}`}
            >
              {v === 'map' ? 'Map' : 'List'}
            </button>
          ))}
        </div>
      </div>

      {view === 'map' ? (
        <div className="relative mx-4 overflow-hidden rounded-2xl bg-[#e7ecdf]">
          <svg viewBox="0 0 100 100" className="block h-auto w-full" aria-hidden="true">
            <rect width="100" height="100" fill="#e9eee2" />
            <path d="M0 58 C20 52 30 62 50 56 S80 46 100 52 L100 60 C80 55 70 64 50 63 S20 60 0 66 Z" fill="#a9d4ec" />
            {['M10 0 L30 100', 'M0 30 L100 22', 'M60 0 L52 100', 'M0 85 L100 78', 'M85 0 L95 100'].map((d) => (
              <path key={d} d={d} stroke="#fff" strokeWidth="2.4" fill="none" />
            ))}
            <circle cx="30" cy="80" r="8" fill="#cfe0b8" />
            <circle cx="70" cy="12" r="6" fill="#cfe0b8" />
          </svg>
          {SITES.map((s) => (
            <button
              key={s.id}
              type="button"
              onClick={() => navigate(`site/${s.id}`)}
              className="absolute flex min-h-14 min-w-14 -translate-x-1/2 -translate-y-full flex-col items-center"
              style={{ left: `${s.map.x}%`, top: `${s.map.y}%` }}
            >
              <span className="rounded-full bg-go-ink px-2 py-0.5 text-[11px] font-bold whitespace-nowrap text-white shadow">
                {s.area}
              </span>
              <span
                aria-hidden="true"
                className="mt-0.5 flex h-8 w-8 items-center justify-center rounded-full border-[3px] border-white bg-go-blue text-sm font-bold text-white shadow-lg"
              >
                ⚡
              </span>
              <span className="sr-only">
                {s.name}, {availability[s.id]} chargers available
              </span>
            </button>
          ))}
        </div>
      ) : null}

      <h2 className={`px-4 pt-4 text-base font-bold ${view === 'map' ? 'sr-only' : ''}`}>Chargers near you</h2>
      <ul className={`space-y-2 p-4 ${view === 'map' ? 'sr-only' : ''}`}>
        {SITES.map((s) => (
          <li key={s.id}>
            <button
              type="button"
              onClick={() => navigate(`site/${s.id}`)}
              className="flex min-h-16 w-full items-center gap-3 rounded-2xl bg-white p-3 text-left shadow-sm"
            >
              <span aria-hidden="true" className="flex h-10 w-10 items-center justify-center rounded-full bg-go-blue text-white">
                ⚡
              </span>
              <span className="flex-1">
                <span className="block font-bold">{s.name}</span>
                <span className="block text-sm text-go-ink/70">
                  {availability[s.id]} of {CHARGERS.filter((c) => c.siteId === s.id).length} available · Rapid
                </span>
              </span>
            </button>
          </li>
        ))}
      </ul>
    </GoShell>
  );
}

const ENTRY_OPTIONS: { id: EntryPoint; label: string }[] = [
  { id: 'go_app', label: 'Opened from Go' },
  { id: 'zapmap', label: 'Opened from Zapmap (possible future integration)' },
  { id: 'qr_on_charger', label: 'Scanned QR on charger' },
];

const REVIEW_TAGS = {
  ealing: { stars: 3.1, count: 48, good: ['Easy to find', 'Well lit'], bad: ['Plug holder too high', 'Stiff plug'] },
  lewisham: { stars: 3.4, count: 31, good: ['Close to shops'], bad: ['Card reader hard to read'] },
  stratford: { stars: 4.2, count: 76, good: ['Fast', 'Plenty of space'], bad: ['Busy at weekends'] },
  brixton: { stars: 3.6, count: 22, good: ['Reliable'], bad: ['Narrow bays'] },
  ashby: { stars: 4.0, count: 118, good: ['Fast', 'Toilets nearby'], bad: ['Queues'] },
} as const;

export function ChargerDetail() {
  const { siteId = 'ealing' } = useParams();
  const navigate = useNavigate();
  const site = siteById(siteId);
  const chargers = CHARGERS.filter((c) => c.siteId === site.id);
  const [entry, setEntry] = useState<EntryPoint>('go_app');
  const start = useDraft((s) => s.start);
  const review = REVIEW_TAGS[site.id as keyof typeof REVIEW_TAGS];
  // Default to the Gen 1 charger the driver is most likely standing at.
  const nearest = [...chargers].reverse().find((c) => c.generation === 'Gen 1') ?? chargers[0];

  return (
    <GoShell
      title={site.name}
      left={
        <button
          type="button"
          onClick={() => navigate('/driver')}
          className="flex min-h-12 min-w-12 items-center justify-center rounded-full bg-white/15 text-xl"
        >
          <span aria-hidden="true">←</span>
          <span className="sr-only">Back to map</span>
        </button>
      }
    >
      <div className="space-y-4 p-4">
        <section className="rounded-2xl bg-white p-4 shadow-sm">
          <h1 className="text-xl font-extrabold">{site.name}</h1>
          <p className="text-sm text-go-ink/70">{site.address}</p>
          <dl className="mt-3 grid grid-cols-2 gap-3 text-sm">
            <div>
              <dt className="text-go-ink/70">Available</dt>
              <dd className="font-bold">
                {availability[site.id]} of {chargers.length}
              </dd>
            </div>
            <div>
              <dt className="text-go-ink/70">Price</dt>
              <dd className="font-bold">£{chargers[0].pricePerKwh.toFixed(2)} per kWh</dd>
            </div>
            <div>
              <dt className="text-go-ink/70">Connectors</dt>
              <dd className="font-bold">CCS, tethered</dd>
            </div>
            <div>
              <dt className="text-go-ink/70">Speed</dt>
              <dd className="font-bold">{chargers[0].model.replace('Rapid ', '')}</dd>
            </div>
          </dl>
          <button
            type="button"
            aria-disabled="true"
            className="mt-4 min-h-14 w-full cursor-not-allowed rounded-xl border-2 border-dashed border-go-blue/50 bg-go-blue/10 font-bold text-go-blue"
          >
            Start charging
          </button>
          <p className="mt-1 text-center text-xs text-go-ink/70">Charging is not active in this demo.</p>
        </section>

        <section className="rounded-2xl bg-white p-4 shadow-sm" aria-labelledby="reviews-h">
          <div className="flex items-baseline justify-between">
            <h2 id="reviews-h" className="font-bold">
              Reviews
            </h2>
            <p className="text-sm">
              <span aria-hidden="true">★</span> {review.stars} out of 5 · {review.count} reviews
            </p>
          </div>
          <ul className="mt-3 flex flex-wrap gap-2 text-sm">
            {review.good.map((t) => (
              <li key={t} className="rounded-full bg-go-accent/15 px-3 py-1">
                <span aria-hidden="true">👍 </span>
                {t}
              </li>
            ))}
            {review.bad.map((t) => (
              <li key={t} className="rounded-full bg-go-purple/10 px-3 py-1">
                <span aria-hidden="true">👎 </span>
                {t}
              </li>
            ))}
          </ul>
          <button type="button" className="mt-3 min-h-12 w-full rounded-xl border-2 border-go-blue font-bold text-go-blue">
            Write a review
          </button>
        </section>

        {/* Hand-over to Cicely */}
        <section className="overflow-hidden rounded-2xl border-2 border-ink bg-cream font-body text-ink" aria-labelledby="cicely-h">
          <p className="bg-ink px-4 py-1 text-xs text-cream">With Cicely</p>
          <div className="p-4">
            <h2 id="cicely-h" className="font-heading text-xl">
              Something not work for you here?
            </h2>
            <p className="mt-1 text-sm text-ink-soft">
              Show us which part of the charger caused the problem. You don't need to know what it's called.
            </p>
            <button
              type="button"
              onClick={() => {
                start(nearest.id, entry);
                navigate('/driver/cicely/charger');
              }}
              className="mt-3 flex min-h-14 w-full items-center justify-center rounded-2xl bg-ink font-heading text-lg text-cream"
            >
              Show us which part
            </button>
          </div>
        </section>

        <fieldset className="rounded-2xl border border-dashed border-go-ink/30 p-3 text-sm">
          <legend className="px-1 font-semibold">Demo only: where the driver came from</legend>
          {ENTRY_OPTIONS.map((o) => (
            <label key={o.id} className="flex min-h-12 items-center gap-3">
              <input
                type="radio"
                name="entry"
                checked={entry === o.id}
                onChange={() => setEntry(o.id)}
                className="h-5 w-5 accent-go-blue"
              />
              {o.label}
            </label>
          ))}
        </fieldset>
      </div>
    </GoShell>
  );
}

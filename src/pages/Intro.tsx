import { useState } from 'react';
import { Link } from 'react-router-dom';
import { CicelyWordmark, Sprig } from '../components/Brand';
import { resetDemoData, useReportStore } from '../store/reports';

export default function Intro() {
  const live = useReportStore((s) => s.liveReports.length);
  const [resetDone, setResetDone] = useState(false);

  return (
    <div className="min-h-dvh bg-cream text-ink">
      <header className="mx-auto flex max-w-5xl items-center justify-between px-6 pt-8">
        <CicelyWordmark className="h-7" />
        <span className="rounded-full border border-ink/30 px-3 py-1 text-sm">Demo with synthetic data</span>
      </header>

      <main className="mx-auto max-w-5xl px-6 pb-16 pt-12">
        <div className="grid items-center gap-10 md:grid-cols-[1.4fr_1fr]">
          <div>
            <p className="font-heading text-lg text-leaf">A concept for public EV charging apps such as Go</p>
            <h1 className="mt-3 text-4xl leading-tight sm:text-5xl">
              A star rating shows that someone had a bad experience. Not which part caused it.
            </h1>
            <p className="mt-6 max-w-prose text-lg leading-relaxed text-ink-soft">
              Go already lets drivers leave stars, tags, a comment and photos on a chargepoint review. Cicely adds one
              step to that journey: the driver points at the part of the charger that caused difficulty, and the photo
              becomes evidence the operator can act on. Which part, what effect it had, and whether a change helped.
            </p>
          </div>
          <Sprig className="mx-auto hidden w-56 md:block" />
        </div>

        <nav aria-label="Choose a view" className="mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <Link
            to="/driver"
            className="group flex min-h-36 flex-col justify-between rounded-3xl bg-mint p-6 transition hover:-translate-y-0.5"
          >
            <span className="font-heading text-2xl">Driver view</span>
            <span className="text-ink-soft">A disabled driver shows which part of the charger was the problem.</span>
          </Link>
          <Link
            to="/operator"
            className="group flex min-h-36 flex-col justify-between rounded-3xl bg-sky p-6 transition hover:-translate-y-0.5"
          >
            <span className="font-heading text-2xl">Operator view</span>
            <span className="text-ink-soft">Every report combined on a 3D model of the charger.</span>
          </Link>
          <Link
            to="/side-by-side"
            className="hidden min-h-36 flex-col justify-between rounded-3xl bg-dandelion p-6 transition hover:-translate-y-0.5 lg:flex"
          >
            <span className="font-heading text-2xl">Side by side</span>
            <span className="text-ink-soft">Phone on the left, operator on the right. Reports appear as they are sent.</span>
          </Link>
        </nav>

        <section className="mt-12 flex flex-wrap items-center gap-4 border-t border-ink/15 pt-6">
          <button
            type="button"
            onClick={() => {
              resetDemoData();
              setResetDone(true);
            }}
            className="min-h-12 rounded-full border-2 border-ink px-5 font-heading hover:bg-ink hover:text-cream"
          >
            Reset demo data
          </button>
          <p role="status" className="text-sm text-ink-soft">
            {resetDone
              ? 'Demo data reset. Only the synthetic reports remain.'
              : live
                ? `${live} report${live === 1 ? '' : 's'} added during this demo.`
                : 'No reports added yet in this browser.'}
          </p>
        </section>

        <p className="mt-8 text-sm text-ink-soft">
          This is a concept demo. All chargers, sites and reports are synthetic. Northway Charging is a fictional
          operator. Go and Zapmap appear only to show where Cicely could sit; no partnership is implied.
        </p>
      </main>
    </div>
  );
}

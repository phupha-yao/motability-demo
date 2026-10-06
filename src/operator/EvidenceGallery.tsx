import { useEffect, useRef, useState } from 'react';
import { PhotoOutline } from '../components/PhotoOutline';
import { groupLabel, impactLabel, outcomeLabel } from '../data/impacts';
import { chargerById, siteById } from '../data/network';
import { TAXONOMY } from '../data/taxonomy';
import { ENTRY_LABELS, type Report } from '../data/types';

const fmtDate = (iso: string) => new Date(iso).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });

export function EvidenceGallery({ reports, highlightId }: { reports: Report[]; highlightId?: string | null }) {
  const [open, setOpen] = useState<Report | null>(null);
  const [limit, setLimit] = useState(8);
  const withEvidence = reports
    .filter((r) => r.photoId || r.photoDataUrl || r.note)
    .sort((a, b) => (a.id === highlightId ? -1 : b.id === highlightId ? 1 : b.createdAt.localeCompare(a.createdAt)));

  if (!withEvidence.length) return <p className="text-sm text-ink-soft">No photos or notes for this selection.</p>;

  return (
    <>
      <ul className="grid grid-cols-2 gap-2">
        {withEvidence.slice(0, limit).map((r) => (
          <li key={r.id}>
            <button
              type="button"
              onClick={() => setOpen(r)}
              className={`block w-full overflow-hidden rounded-xl border-2 bg-paper text-left ${
                r.id === highlightId ? 'pulse border-malibu' : 'border-ink/15'
              }`}
            >
              {r.photoId || r.photoDataUrl ? (
                <PhotoOutline photoId={r.photoId} photoDataUrl={r.photoDataUrl} polygon={r.polygon} alt="" className="aspect-square rounded-none object-cover" />
              ) : (
                <div className="flex aspect-square items-center bg-cream-deep p-2 text-xs italic">“{r.note}”</div>
              )}
              <span className="block p-1.5 text-xs">
                {r.id === highlightId && <span className="mr-1 rounded bg-malibu px-1 font-semibold">New</span>}
                {r.impacts.slice(0, 1).map(impactLabel).join(', ')}
                <span className="block text-ink-soft">{fmtDate(r.createdAt)}</span>
              </span>
              <span className="sr-only">Open report from {fmtDate(r.createdAt)}</span>
            </button>
          </li>
        ))}
      </ul>
      {withEvidence.length > limit && (
        <button type="button" className="mt-2 min-h-10 text-sm underline underline-offset-4" onClick={() => setLimit((l) => l + 8)}>
          Show more ({withEvidence.length - limit} more)
        </button>
      )}
      {open && <ReportDialog report={open} onClose={() => setOpen(null)} />}
    </>
  );
}

function ReportDialog({ report: r, onClose }: { report: Report; onClose: () => void }) {
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const d = ref.current;
    d?.showModal();
    return () => d?.close();
  }, []);
  const ch = chargerById(r.chargerId);
  return (
    <dialog
      ref={ref}
      onClose={onClose}
      onClick={(e) => e.target === ref.current && onClose()}
      aria-labelledby="report-title"
      className="m-auto w-[min(720px,94vw)] rounded-3xl bg-cream p-0 text-ink backdrop:bg-ink/60"
    >
      <div className="grid gap-4 p-5 sm:grid-cols-[1fr_1.1fr]">
        <PhotoOutline photoId={r.photoId} photoDataUrl={r.photoDataUrl} polygon={r.polygon} alt={`Driver photo with the ${TAXONOMY[r.componentId].label.toLowerCase()} outlined`} />
        <div>
          <h2 id="report-title" className="text-2xl">
            {TAXONOMY[r.componentId].label}
          </h2>
          <p className="text-sm text-ink-soft">
            {fmtDate(r.createdAt)} · {ch?.name}, {siteById(r.siteId).name} · {r.generation}
          </p>
          <ul className="mt-3 flex flex-wrap gap-1.5">
            {r.impacts.map((i) => (
              <li key={i} className="rounded-full bg-dandelion px-2.5 py-1 text-sm">
                {impactLabel(i)}
              </li>
            ))}
          </ul>
          <p className="mt-3">{outcomeLabel(r.outcome)}</p>
          {r.note && (
            <blockquote className="mt-3 border-l-4 border-fall pl-3 italic">
              “{r.note}”{r.noteKind === 'voice' && <span className="block text-sm not-italic text-ink-soft">Voice note, transcribed</span>}
            </blockquote>
          )}
          <dl className="mt-3 grid grid-cols-2 gap-x-3 gap-y-1 text-sm">
            <dt className="text-ink-soft">Pointed by</dt>
            <dd>{r.segmentationPrompt === 'tap' ? 'Tap' : r.segmentationPrompt === 'lasso' ? 'Drawing round' : 'Choosing from a list'}</dd>
            <dt className="text-ink-soft">Part confirmed</dt>
            <dd>{r.componentConfirmed ? 'Yes, by the driver' : 'No'}</dd>
            <dt className="text-ink-soft">Came from</dt>
            <dd>{ENTRY_LABELS[r.entryPoint]}</dd>
            <dt className="text-ink-soft">Conditions</dt>
            <dd>{r.weather ?? 'Not recorded'}</dd>
          </dl>
          {r.selfDescribedGroups?.length ? (
            <p className="mt-3 text-sm text-ink-soft">Shared by the driver: {r.selfDescribedGroups.map(groupLabel).join(', ')}</p>
          ) : null}
          <button type="button" onClick={onClose} className="mt-5 min-h-12 rounded-full border-2 border-ink px-5 font-heading" autoFocus>
            Close
          </button>
        </div>
      </div>
    </dialog>
  );
}

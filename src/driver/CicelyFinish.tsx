import { useEffect, useRef, useState, type ReactNode } from 'react';
import { Link, Navigate, useNavigate } from 'react-router-dom';
import { PhotoOutline } from '../components/PhotoOutline';
import { GROUPS, IMPACTS, OUTCOMES, impactLabel, outcomeLabel, type ImpactId } from '../data/impacts';
import { CHARGERS, OPERATOR, chargerById, siteById } from '../data/network';
import { maskFor } from '../data/photos';
import { TAXONOMY, type ComponentId } from '../data/taxonomy';
import type { Report } from '../data/types';
import { useDraft } from '../store/draft';
import { useReportStore } from '../store/reports';
import { isEmbedded } from '../components/PhoneFrame';
import { CicelyLayout, PrimaryButton, SecondaryButton, TextButton, Tile } from './ui';

const article = (label: string) => `the ${label.toLowerCase()}`;

export function ConfirmPart() {
  const navigate = useNavigate();
  const { segmentation, photoId, photoDataUrl, update } = useDraft();
  const [showAlternatives, setShowAlternatives] = useState(false);
  if (!segmentation) return <Navigate to="/driver/cicely/point" replace />;

  const best = TAXONOMY[segmentation.componentId];
  const unsure = segmentation.confidence < 0.75;

  const choose = (id: ComponentId, confirmed: boolean) => {
    const mask = maskFor(photoId, id);
    update({
      componentId: id,
      componentConfirmed: confirmed,
      segmentation: { ...segmentation, componentId: id, polygon: mask?.polygon ?? segmentation.polygon },
    });
    navigate('/driver/cicely/what');
  };

  const options = unsure ? [segmentation.componentId, ...segmentation.alternatives] : segmentation.alternatives;

  const altTiles = (
    <ul className="mt-3 space-y-2" aria-label="Other parts it could be">
      {options.map((id) => (
        <li key={id}>
          <button
            type="button"
            onClick={() => choose(id, true)}
            className="flex min-h-16 w-full flex-col justify-center rounded-2xl border-2 border-ink/25 bg-paper/60 px-4 py-2 text-left hover:border-ink"
          >
            <span className="font-heading">{TAXONOMY[id].label}</span>
            <span className="text-sm text-ink-soft">{TAXONOMY[id].description}</span>
          </button>
        </li>
      ))}
      <li>
        <button
          type="button"
          onClick={() => navigate('/driver/cicely/list')}
          className="flex min-h-14 w-full items-center rounded-2xl border-2 border-dashed border-ink/40 px-4 text-left"
        >
          Something else, choose from the full list
        </button>
      </li>
    </ul>
  );

  return (
    <CicelyLayout
      step={4}
      title={unsure ? 'Which of these is it?' : `Is this ${article(best.label)}?`}
      footer={
        unsure ? (
          <SecondaryButton onClick={() => navigate('/driver/cicely/point')}>Try again</SecondaryButton>
        ) : (
          <>
            <PrimaryButton onClick={() => choose(segmentation.componentId, true)}>Yes</PrimaryButton>
            <div className="grid grid-cols-2 gap-2">
              <SecondaryButton aria-expanded={showAlternatives} onClick={() => setShowAlternatives((v) => !v)}>
                No, it's this
              </SecondaryButton>
              <SecondaryButton onClick={() => navigate('/driver/cicely/point')}>Try again</SecondaryButton>
            </div>
          </>
        )
      }
    >
      <PhotoOutline
        photoId={photoId}
        photoDataUrl={photoDataUrl}
        polygon={segmentation.polygon}
        alt={`Your photo with ${article(best.label)} outlined`}
        animate
        className="max-h-[46vh] w-auto object-contain"
      />
      {unsure ? (
        <>
          <p className="mt-4 text-base">We're not sure which part you meant. Choose the closest one.</p>
          {altTiles}
        </>
      ) : (
        <>
          <p className="mt-4 text-lg">
            <strong className="font-heading">{best.label}.</strong> {best.description}
          </p>
          {best.alsoCalled.length > 0 && <p className="mt-1 text-sm text-ink-soft">Also called: {best.alsoCalled.join(', ')}</p>}
          {showAlternatives && altTiles}
        </>
      )}
    </CicelyLayout>
  );
}

export function WhatHappened() {
  const navigate = useNavigate();
  const { impacts, outcome, componentId, update } = useDraft();
  const [tried, setTried] = useState(false);
  if (!componentId) return <Navigate to="/driver/cicely/point" replace />;

  const toggle = (id: ImpactId) =>
    update({ impacts: impacts.includes(id) ? impacts.filter((i) => i !== id) : [...impacts, id] });
  const ready = impacts.length > 0 && !!outcome;

  return (
    <CicelyLayout
      step={5}
      title={`What happened with ${article(TAXONOMY[componentId].label)}?`}
      footer={
        <>
          {tried && !ready && (
            <p role="alert" className="text-sm font-semibold text-[#9a1d3c]">
              {impacts.length === 0 ? 'Choose at least one thing that happened.' : 'Tell us if you finished charging.'}
            </p>
          )}
          <PrimaryButton
            aria-disabled={!ready}
            className={ready ? '' : 'opacity-60'}
            onClick={() => (ready ? navigate('/driver/cicely/more') : setTried(true))}
          >
            Continue
          </PrimaryButton>
        </>
      }
    >
      <fieldset>
        <legend className="mb-3 text-base">Choose all that apply.</legend>
        <div className="grid gap-2">
          {IMPACTS.map((i) => (
            <Tile key={i.id} selected={impacts.includes(i.id)} onClick={() => toggle(i.id)} icon={i.icon}>
              {i.label}
            </Tile>
          ))}
        </div>
      </fieldset>
      <fieldset className="mt-6">
        <legend className="mb-3 font-heading text-xl">Did you finish charging?</legend>
        <div role="radiogroup" className="grid gap-2">
          {OUTCOMES.map((o) => (
            <Tile key={o.id} role="radio" selected={outcome === o.id} onClick={() => update({ outcome: o.id })}>
              {o.label}
            </Tile>
          ))}
        </div>
      </fieldset>
    </CicelyLayout>
  );
}

type SpeechRec = {
  lang: string;
  interimResults: boolean;
  continuous: boolean;
  onresult: ((e: { results: ArrayLike<ArrayLike<{ transcript: string }>> }) => void) | null;
  onerror: (() => void) | null;
  onend: (() => void) | null;
  start: () => void;
  stop: () => void;
};

const FAKE_TRANSCRIPT = 'The plug was clipped in too high and I couldn\'t pull it out from my chair. Someone had to help me.';

export function TellUsMore() {
  const navigate = useNavigate();
  const { note, noteKind, update } = useDraft();
  const [recording, setRecording] = useState(false);
  const [simulated, setSimulated] = useState(false);
  const recRef = useRef<SpeechRec | null>(null);
  const timer = useRef<number | undefined>(undefined);
  const value = note ?? '';

  useEffect(
    () => () => {
      recRef.current?.stop();
      window.clearTimeout(timer.current);
    },
    [],
  );

  const startRecording = () => {
    const w = window as unknown as { SpeechRecognition?: new () => SpeechRec; webkitSpeechRecognition?: new () => SpeechRec };
    const Ctor = w.SpeechRecognition ?? w.webkitSpeechRecognition;
    setRecording(true);
    update({ note: '', noteKind: 'voice' });
    const fake = (delay = 3000) => {
      setSimulated(true);
      timer.current = window.setTimeout(() => {
        update({ note: FAKE_TRANSCRIPT, noteKind: 'voice' });
        setRecording(false);
      }, delay);
    };
    if (!Ctor) return fake();
    try {
      const rec = new Ctor();
      rec.lang = 'en-GB';
      rec.interimResults = true;
      rec.continuous = true;
      // Some browsers expose the API but never deliver results; fall back after 3 seconds.
      const watchdog = window.setTimeout(() => {
        rec.onend = null;
        rec.stop();
        fake(0);
      }, 3000);
      timer.current = watchdog;
      rec.onresult = (e) => {
        window.clearTimeout(watchdog);
        const text = Array.from(e.results)
          .map((r) => r[0].transcript)
          .join(' ')
          .slice(0, 280);
        update({ note: text, noteKind: 'voice' });
      };
      rec.onerror = () => {
        window.clearTimeout(watchdog);
        rec.onend = null;
        fake();
      };
      rec.onend = () => setRecording(false);
      recRef.current = rec;
      rec.start();
    } catch {
      fake();
    }
  };

  const stopRecording = () => {
    window.clearTimeout(timer.current);
    if (recRef.current) recRef.current.onend = null;
    recRef.current?.stop();
    recRef.current = null;
    if (simulated) update({ note: FAKE_TRANSCRIPT, noteKind: 'voice' });
    setRecording(false);
  };

  return (
    <CicelyLayout
      step={6}
      title="Tell us more (optional)"
      footer={
        <div className="grid grid-cols-2 gap-2">
          <SecondaryButton
            onClick={() => {
              update({ note: undefined, noteKind: undefined });
              navigate('/driver/cicely/about');
            }}
          >
            Skip
          </SecondaryButton>
          <PrimaryButton
            onClick={() => {
              if (recording) stopRecording();
              navigate('/driver/cicely/about');
            }}
          >
            Continue
          </PrimaryButton>
        </div>
      }
    >
      <label htmlFor="note" className="block text-base">
        Anything the operator should know? A sentence is plenty.
      </label>
      <textarea
        id="note"
        value={value}
        maxLength={280}
        rows={4}
        onChange={(e) => update({ note: e.target.value, noteKind: 'text' })}
        aria-describedby="note-count"
        className="mt-2 w-full rounded-2xl border-2 border-ink bg-paper p-4 text-lg"
      />
      <p id="note-count" className="text-right text-sm text-ink-soft">
        {value.length} of 280 characters
      </p>

      <div className="mt-4">
        {recording ? (
          <PrimaryButton onClick={stopRecording} className="bg-malibu text-ink">
            <span aria-hidden="true" className="pulse inline-block h-3 w-3 rounded-full bg-ink" /> Stop recording
          </PrimaryButton>
        ) : (
          <SecondaryButton onClick={startRecording}>
            <span aria-hidden="true">🎙</span> Record a voice note
          </SecondaryButton>
        )}
        <p role="status" className="mt-2 text-sm text-ink-soft">
          {recording
            ? simulated
              ? 'Recording… (demo: a sample transcript will appear)'
              : 'Listening… your words appear in the box above.'
            : noteKind === 'voice' && value
              ? 'Voice note saved as text. You can edit it above.'
              : ''}
        </p>
      </div>
    </CicelyLayout>
  );
}

export function AboutYou() {
  const navigate = useNavigate();
  const { groups, preferNotToSay, update } = useDraft();

  return (
    <CicelyLayout
      step={7}
      title="About you (optional)"
      footer={
        <div className="grid grid-cols-2 gap-2">
          <SecondaryButton
            onClick={() => {
              update({ groups: [], preferNotToSay: false });
              navigate('/driver/cicely/check');
            }}
          >
            Skip
          </SecondaryButton>
          <PrimaryButton onClick={() => navigate('/driver/cicely/check')}>Continue</PrimaryButton>
        </div>
      }
    >
      <p className="text-base">
        This helps the operator see if a problem affects some people more than others. It is never shown as a profile of
        you.
      </p>
      <fieldset className="mt-4">
        <legend className="mb-3 font-heading">Choose any that describe you</legend>
        <div className="grid gap-2">
          {GROUPS.map((g) => (
            <Tile
              key={g.id}
              selected={groups.includes(g.id)}
              onClick={() =>
                update({
                  preferNotToSay: false,
                  groups: groups.includes(g.id) ? groups.filter((x) => x !== g.id) : [...groups, g.id],
                })
              }
            >
              {g.label}
            </Tile>
          ))}
          <Tile selected={preferNotToSay} onClick={() => update({ preferNotToSay: !preferNotToSay, groups: [] })}>
            Prefer not to say
          </Tile>
        </div>
      </fieldset>
    </CicelyLayout>
  );
}

export function CheckAndSend() {
  const navigate = useNavigate();
  const draft = useDraft();
  const addReport = useReportStore((s) => s.addReport);
  const charger = chargerById(draft.chargerId) ?? CHARGERS[0];
  const [error, setError] = useState('');
  if (!draft.componentId) return <Navigate to="/driver/cicely/point" replace />;
  const part = TAXONOMY[draft.componentId];

  const send = () => {
    if (!draft.componentId || !draft.outcome || !draft.impacts.length) {
      setError('Some answers are missing. Go back and check "What happened".');
      return;
    }
    const report: Report = {
      id: `live-${Date.now().toString(36)}`,
      createdAt: new Date().toISOString(),
      chargerId: charger.id,
      siteId: charger.siteId,
      operatorId: OPERATOR.id,
      chargerModel: charger.model,
      generation: charger.generation,
      entryPoint: draft.entryPoint,
      identifiedBy: draft.identifiedBy,
      photoId: draft.photoId,
      photoDataUrl: draft.photoDataUrl,
      componentId: draft.componentId,
      componentConfirmed: draft.componentConfirmed,
      segmentationPrompt: draft.segmentationPrompt ?? 'list',
      polygon: draft.segmentation?.polygon,
      impacts: draft.impacts,
      outcome: draft.outcome,
      note: draft.note?.trim() || undefined,
      noteKind: draft.note?.trim() ? draft.noteKind : undefined,
      selfDescribedGroups: draft.groups.length ? draft.groups : undefined,
      weather: 'dry',
    };
    try {
      addReport(report);
    } catch {
      setError('Your report could not be saved on this device. Try removing your own photo and sending again.');
      return;
    }
    draft.update({ submittedId: report.id });
    try {
      window.parent?.postMessage({ type: 'cicely:report-sent', id: report.id }, window.location.origin);
    } catch {
      /* not embedded */
    }
    navigate('/driver/cicely/sent');
  };

  const Row = ({ label, children, to }: { label: string; children: ReactNode; to: string }) => (
    <div className="border-t border-ink/10 py-3 first:border-t-0">
      <dt className="flex items-center justify-between text-sm text-ink-soft">
        {label}
        <Link to={to} className="inline-flex min-h-11 items-center px-2 text-ink underline underline-offset-4">
          Change<span className="sr-only"> {label.toLowerCase()}</span>
        </Link>
      </dt>
      <dd className="text-base">{children}</dd>
    </div>
  );

  return (
    <CicelyLayout
      step={8}
      title="Check and send"
      footer={
        <>
          {error && (
            <p role="alert" className="text-sm font-semibold text-[#9a1d3c]">
              {error}
            </p>
          )}
          <PrimaryButton onClick={send}>Send to {OPERATOR.name}</PrimaryButton>
        </>
      }
    >
      <div className="overflow-hidden rounded-3xl border-2 border-ink/15 bg-paper/60">
        <PhotoOutline
          photoId={draft.photoId}
          photoDataUrl={draft.photoDataUrl}
          polygon={draft.segmentation?.polygon}
          alt={`Photo with ${article(part.label)} outlined`}
          className="max-h-64 rounded-none object-cover"
        />
        <dl className="px-4 py-2">
          <Row label="Charger" to="/driver/cicely/charger">
            {charger.name}, {siteById(charger.siteId).name}
          </Row>
          <Row label="Part" to="/driver/cicely/point">
            {part.label}
          </Row>
          <Row label="What happened" to="/driver/cicely/what">
            <ul className="flex flex-wrap gap-1.5 pt-1">
              {draft.impacts.map((i) => (
                <li key={i} className="rounded-full bg-dandelion px-3 py-1 text-sm">
                  {impactLabel(i)}
                </li>
              ))}
            </ul>
            {draft.outcome && <p className="mt-1">{outcomeLabel(draft.outcome)}</p>}
          </Row>
          <Row label="Note" to="/driver/cicely/more">
            {draft.note?.trim() ? (
              <>
                {draft.noteKind === 'voice' && <span className="text-sm text-ink-soft">Voice note: </span>}“{draft.note}”
              </>
            ) : (
              <span className="text-ink-soft">No note</span>
            )}
          </Row>
          <Row label="About you" to="/driver/cicely/about">
            {draft.groups.length ? (
              GROUPS.filter((g) => draft.groups.includes(g.id))
                .map((g) => g.label)
                .join('; ')
            ) : (
              <span className="text-ink-soft">Not shared</span>
            )}
          </Row>
        </dl>
      </div>
      <p className="mt-3 text-sm text-ink-soft">
        {OPERATOR.name} sees your photo, the part and what happened. Your name is not shared.
      </p>
    </CicelyLayout>
  );
}

export function Sent() {
  const navigate = useNavigate();
  const { submittedId, clear } = useDraft();
  const embedded = isEmbedded();
  const [pointed, setPointed] = useState(false);

  return (
    <CicelyLayout title="Thank you" onBack={() => navigate('/driver')}>
      <div className="rounded-3xl bg-mint p-5">
        <p className="text-xl leading-snug">The operator can now see exactly which part caused the problem.</p>
      </div>
      <p className="mt-4 flex items-start gap-2 text-base">
        <span aria-hidden="true">★</span>
        Your report has also been added to your Go review for this chargepoint.
      </p>
      <div className="mt-6 grid gap-2">
        <PrimaryButton
          onClick={() => {
            if (embedded) {
              window.parent?.postMessage({ type: 'cicely:report-sent', id: submittedId }, window.location.origin);
              setPointed(true);
            } else navigate(`/operator${submittedId ? `?highlight=${submittedId}` : ''}`);
          }}
        >
          See what the operator sees
        </PrimaryButton>
        {pointed && (
          <p role="status" className="text-center text-sm">
            It's on the operator view now, highlighted on the 3D charger.
          </p>
        )}
        <TextButton
          onClick={() => {
            clear();
            navigate('/driver');
          }}
        >
          Back to Go
        </TextButton>
      </div>
    </CicelyLayout>
  );
}

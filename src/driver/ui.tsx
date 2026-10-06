import type { ButtonHTMLAttributes, ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';
import { PoweredByCicely } from '../components/Brand';

type BtnProps = ButtonHTMLAttributes<HTMLButtonElement> & { children: ReactNode };

export function PrimaryButton({ className = '', ...p }: BtnProps) {
  return (
    <button
      type="button"
      {...p}
      className={`flex min-h-14 w-full items-center justify-center gap-2 rounded-2xl bg-ink px-5 font-heading text-lg text-cream transition active:scale-[0.99] disabled:cursor-not-allowed disabled:bg-ink/40 ${className}`}
    />
  );
}

export function SecondaryButton({ className = '', ...p }: BtnProps) {
  return (
    <button
      type="button"
      {...p}
      className={`flex min-h-14 w-full items-center justify-center gap-2 rounded-2xl border-2 border-ink bg-cream px-5 font-heading text-lg text-ink transition active:scale-[0.99] ${className}`}
    />
  );
}

export function TextButton({ className = '', ...p }: BtnProps) {
  return (
    <button
      type="button"
      {...p}
      className={`min-h-14 w-full px-4 text-base text-ink underline decoration-2 underline-offset-4 ${className}`}
    />
  );
}

/** Toggle tile with a visible tick, so selection never relies on colour alone. */
export function Tile({
  selected,
  onClick,
  children,
  icon,
  role = 'checkbox',
  className = '',
}: {
  selected: boolean;
  onClick: () => void;
  children: ReactNode;
  icon?: ReactNode;
  role?: 'checkbox' | 'radio';
  className?: string;
}) {
  return (
    <button
      type="button"
      role={role}
      aria-checked={selected}
      onClick={onClick}
      className={`relative flex min-h-16 w-full items-center gap-3 rounded-2xl border-2 px-4 py-3 text-left text-base leading-snug transition ${
        selected ? 'border-ink bg-mint' : 'border-ink/25 bg-paper/60 hover:border-ink/60'
      } ${className}`}
    >
      {icon && (
        <span aria-hidden="true" className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-cream text-lg">
          {icon}
        </span>
      )}
      <span className="flex-1">{children}</span>
      <span
        aria-hidden="true"
        className={`flex h-6 w-6 shrink-0 items-center justify-center ${role === 'radio' ? 'rounded-full' : 'rounded-md'} border-2 border-ink text-sm ${
          selected ? 'bg-ink text-cream' : 'bg-cream'
        }`}
      >
        {selected ? '✓' : ''}
      </span>
    </button>
  );
}

export const CICELY_STEPS = ['Charger', 'Photo', 'Point', 'Check part', 'What happened', 'Tell us more', 'About you', 'Send'];

export function CicelyLayout({
  step,
  title,
  children,
  footer,
  onBack,
}: {
  step?: number;
  title: string;
  children: ReactNode;
  footer?: ReactNode;
  onBack?: () => void;
}) {
  const navigate = useNavigate();
  return (
    <div className="flex h-full min-h-0 flex-col bg-cream text-ink">
      <PoweredByCicely />
      <div className="flex items-center gap-2 border-b border-ink/10 px-2 py-1">
        <button
          type="button"
          onClick={onBack ?? (() => navigate(-1))}
          className="flex min-h-14 min-w-14 items-center gap-1 rounded-xl px-3 text-base"
        >
          <span aria-hidden="true" className="text-xl">
            ←
          </span>
          Back
        </button>
        {step !== undefined && (
          <p className="ml-auto pr-3 text-sm text-ink-soft">
            Step {step} of {CICELY_STEPS.length}
            <span className="sr-only">: {CICELY_STEPS[step - 1]}</span>
          </p>
        )}
      </div>
      {step !== undefined && (
        <div className="flex gap-1 px-4 pt-2" aria-hidden="true">
          {CICELY_STEPS.map((s, i) => (
            <span key={s} className={`h-1.5 flex-1 rounded-full ${i < step ? 'bg-ink' : 'bg-ink/15'}`} />
          ))}
        </div>
      )}
      <main className="min-h-0 flex-1 overflow-y-auto px-5 pb-6 pt-4" id="cicely-main">
        <h1 className="mb-4 text-[1.65rem] leading-tight" tabIndex={-1} data-autofocus>
          {title}
        </h1>
        {children}
      </main>
      {footer && <div className="flex flex-col gap-2 border-t border-ink/10 bg-cream px-5 py-3">{footer}</div>}
    </div>
  );
}

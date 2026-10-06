export function CicelyWordmark({ className = 'h-6' }: { className?: string }) {
  return <img src="/brand/cicely-wordmark.svg" alt="Cicely" className={`${className} w-auto`} />;
}

export function PoweredByCicely() {
  return (
    <div className="flex items-center justify-center gap-2 bg-ink px-4 py-1.5 text-xs text-cream">
      <span>Powered by</span>
      <img src="/brand/cicely-wordmark.svg" alt="Cicely" className="h-3.5 w-auto invert" />
    </div>
  );
}

export function GoWordmark({ size = 36 }: { size?: number }) {
  return (
    <span
      aria-label="Go"
      role="img"
      className="inline-flex items-center justify-center rounded-full bg-go-blue font-go font-extrabold text-white"
      style={{ width: size, height: size, fontSize: size * 0.45 }}
    >
      Go
    </span>
  );
}

/** Decorative botanical sprig used on Cicely screens. */
export function Sprig({ className = '' }: { className?: string }) {
  return (
    <svg viewBox="0 0 120 120" aria-hidden="true" className={className}>
      <path d="M20 110 C40 80 60 60 100 20" stroke="#4f5a1c" strokeWidth="3" fill="none" strokeLinecap="round" />
      <ellipse cx="45" cy="78" rx="16" ry="7" transform="rotate(-50 45 78)" fill="#d9e97f" />
      <ellipse cx="62" cy="58" rx="16" ry="7" transform="rotate(30 62 58)" fill="#b4b94d" />
      <ellipse cx="78" cy="42" rx="14" ry="6" transform="rotate(-50 78 42)" fill="#d9e97f" />
      <circle cx="100" cy="20" r="8" fill="#fe8d54" />
    </svg>
  );
}

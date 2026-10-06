import type { ReactNode } from 'react';
import { GoWordmark } from '../components/Brand';

const TABS = [
  { id: 'map', label: 'Map', icon: '⌖' },
  { id: 'charging', label: 'Charging', icon: '⚡' },
  { id: 'wallet', label: 'Wallet', icon: '▭' },
  { id: 'more', label: 'More', icon: '⋯' },
];

export function GoShell({ title, children, left }: { title: string; children: ReactNode; left?: ReactNode }) {
  return (
    <div className="go-shell flex h-full min-h-0 flex-col bg-go-surface font-go text-go-ink">
      <header className="flex items-center gap-3 bg-gradient-to-r from-go-blue to-go-purple px-4 pb-3 pt-4 text-white">
        {left ?? <GoWordmark size={36} />}
        <p className="text-lg font-bold">{title}</p>
      </header>
      <div className="min-h-0 flex-1 overflow-y-auto">{children}</div>
      <nav aria-label="Go app" className="grid grid-cols-4 border-t border-go-ink/10 bg-white">
        {TABS.map((t) => (
          <button
            key={t.id}
            type="button"
            aria-current={t.id === 'map' ? 'page' : undefined}
            className={`flex min-h-14 flex-col items-center justify-center text-xs font-semibold ${
              t.id === 'map' ? 'text-go-blue' : 'text-go-ink/70'
            }`}
          >
            <span aria-hidden="true" className="text-lg leading-none">
              {t.icon}
            </span>
            {t.label}
            {t.id === 'map' && <span className="mt-0.5 h-1 w-6 rounded-full bg-go-blue" aria-hidden="true" />}
          </button>
        ))}
      </nav>
    </div>
  );
}

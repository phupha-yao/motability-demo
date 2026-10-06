import type { ReactNode } from 'react';

/**
 * 390 x 844 phone frame on wide screens. On narrow screens (or at high zoom)
 * the frame drops away and the app fills the viewport, so nothing scrolls sideways.
 */
export function PhoneFrame({ children, bare = false }: { children: ReactNode; bare?: boolean }) {
  if (bare) return <div className="flex h-dvh flex-col overflow-hidden">{children}</div>;
  return (
    <div className="flex min-h-dvh items-start justify-center bg-[#2a2a33] sm:items-center sm:p-6">
      <div className="relative flex h-dvh w-full flex-col overflow-hidden bg-white sm:h-[844px] sm:max-h-[calc(100dvh-3rem)] sm:w-[390px] sm:rounded-[48px] sm:border-[10px] sm:border-[#111] sm:shadow-2xl">
        {children}
      </div>
    </div>
  );
}

export const isEmbedded = () => {
  try {
    return window.self !== window.top || new URLSearchParams(window.location.search).has('bare');
  } catch {
    return true;
  }
};

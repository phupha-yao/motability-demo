import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { SEED_REPORTS } from '../data/seed';
import type { Report } from '../data/types';

interface ReportState {
  /** Reports made in this browser during the demo. Seed data is regenerated on load. */
  liveReports: Report[];
  addReport: (r: Report) => void;
  reset: () => void;
}

export const STORAGE_KEY = 'cicely-go-demo:reports';

export const useReportStore = create<ReportState>()(
  persist(
    (set) => ({
      liveReports: [],
      addReport: (r) => set((s) => ({ liveReports: [...s.liveReports, { ...r, live: true }] })),
      reset: () => set({ liveReports: [] }),
    }),
    { name: STORAGE_KEY, version: 1 },
  ),
);

// Keep tabs and the side-by-side iframe in sync.
if (typeof window !== 'undefined') {
  window.addEventListener('storage', (e) => {
    if (e.key === STORAGE_KEY) useReportStore.persist.rehydrate();
  });
}

let cache: { live: Report[]; all: Report[] } | null = null;
export function useAllReports(): Report[] {
  const live = useReportStore((s) => s.liveReports);
  if (!cache || cache.live !== live) cache = { live, all: [...SEED_REPORTS, ...live] };
  return cache.all;
}

export function resetDemoData() {
  useReportStore.getState().reset();
  try {
    sessionStorage.clear();
  } catch {
    /* ignore */
  }
}

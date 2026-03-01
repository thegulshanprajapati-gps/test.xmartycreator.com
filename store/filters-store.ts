import { create } from 'zustand';

type TestFiltersState = {
  status: string;
  batchId: string;
  courseId: string;
  paid: 'all' | 'free' | 'paid';
  query: string;
  set: (patch: Partial<Omit<TestFiltersState, 'set' | 'reset'>>) => void;
  reset: () => void;
};

const initial = {
  status: 'all',
  batchId: 'all',
  courseId: 'all',
  paid: 'all' as const,
  query: '',
};

export const useTestFiltersStore = create<TestFiltersState>((set) => ({
  ...initial,
  set: (patch) => set((state) => ({ ...state, ...patch })),
  reset: () => set(initial),
}));

import { create } from 'zustand';

interface OracleStore {
  totalPredictions: number;
  incrementPredictions: () => void;
}

export const useOracleStore = create<OracleStore>((set) => ({
  totalPredictions: 0,
  incrementPredictions: () => set((state) => ({ totalPredictions: state.totalPredictions + 1 })),
}));

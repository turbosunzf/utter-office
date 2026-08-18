import { create } from "zustand";
import type { AsrFinal, AsrPartial } from "@/services/recording/realtime/types";

type AsrState = {
  partial: AsrPartial | null;
  finals: AsrFinal[];
  setPartial: (partial: AsrPartial | null) => void;
  pushFinal: (line: AsrFinal) => void;
  reset: () => void;
};

export const useRecordingAsrStore = create<AsrState>((set) => ({
  partial: null,
  finals: [],
  setPartial: (partial) => set({ partial }),
  pushFinal: (line) => set((s) => ({ finals: [...s.finals, line] })),
  reset: () => set({ partial: null, finals: [] }),
}));

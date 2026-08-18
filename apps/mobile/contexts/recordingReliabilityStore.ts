import { create } from "zustand";

type ReliabilityState = {
  lastError: string | null;
  interruptReason: string | null;
  interruptPolling: boolean;
  memoryPressure: string | null;
  setError: (lastError: string | null) => void;
  setInterrupt: (reason: string | null) => void;
  setInterruptPolling: (interruptPolling: boolean) => void;
  setMemoryPressure: (memoryPressure: string | null) => void;
  reset: () => void;
};

export const useRecordingReliabilityStore = create<ReliabilityState>((set) => ({
  lastError: null,
  interruptReason: null,
  interruptPolling: false,
  memoryPressure: null,
  setError: (lastError) => set({ lastError }),
  setInterrupt: (interruptReason) => set({ interruptReason }),
  setInterruptPolling: (interruptPolling) => set({ interruptPolling }),
  setMemoryPressure: (memoryPressure) => set({ memoryPressure }),
  reset: () =>
    set({
      lastError: null,
      interruptReason: null,
      interruptPolling: false,
      memoryPressure: null,
    }),
}));

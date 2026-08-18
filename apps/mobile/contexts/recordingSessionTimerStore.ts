import { create } from "zustand";

type TimerState = {
  elapsedSeconds: number;
  accumulatedPauseMs: number;
  pausedAt: number | null;
  baseDurationMs: number;
  startedAt: number | null;
  setElapsed: (elapsedSeconds: number) => void;
  begin: (baseDurationMs: number) => void;
  markPause: () => void;
  markResume: () => void;
  reset: () => void;
};

export const useRecordingSessionTimerStore = create<TimerState>((set, get) => ({
  elapsedSeconds: 0,
  accumulatedPauseMs: 0,
  pausedAt: null,
  baseDurationMs: 0,
  startedAt: null,
  setElapsed: (elapsedSeconds) => set({ elapsedSeconds }),
  begin: (baseDurationMs) =>
    set({
      baseDurationMs,
      startedAt: Date.now(),
      accumulatedPauseMs: 0,
      pausedAt: null,
      elapsedSeconds: Math.floor(baseDurationMs / 1000),
    }),
  markPause: () => set({ pausedAt: Date.now() }),
  markResume: () => {
    const { pausedAt, accumulatedPauseMs } = get();
    if (!pausedAt) return;
    set({
      accumulatedPauseMs: accumulatedPauseMs + (Date.now() - pausedAt),
      pausedAt: null,
    });
  },
  reset: () =>
    set({
      elapsedSeconds: 0,
      accumulatedPauseMs: 0,
      pausedAt: null,
      baseDurationMs: 0,
      startedAt: null,
    }),
}));

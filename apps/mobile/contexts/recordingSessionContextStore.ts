import { create } from "zustand";
import type { RecordingStatus } from "@/data/recording/recordingTypes";

export type SealedMeta = {
  file: string;
  index: number;
  durationMs: number;
};

type SessionContextState = {
  status: RecordingStatus;
  sessionId: string | null;
  sessionDir: string | null;
  recordingId: string | null;
  masterKey: string | null;
  title: string;
  sealed: SealedMeta[];
  lastIndex: number;
  error: string | null;
  stopping: boolean;
  setStatus: (status: RecordingStatus) => void;
  patch: (partial: Partial<Omit<SessionContextState, "setStatus" | "patch" | "reset">>) => void;
  reset: () => void;
};

const empty = {
  status: "idle" as RecordingStatus,
  sessionId: null,
  sessionDir: null,
  recordingId: null,
  masterKey: null,
  title: "",
  sealed: [] as SealedMeta[],
  lastIndex: -1,
  error: null,
  stopping: false,
};

export const useRecordingSessionContextStore = create<SessionContextState>(
  (set) => ({
    ...empty,
    setStatus: (status) => set({ status }),
    patch: (partial) => set(partial),
    reset: () => set(empty),
  }),
);

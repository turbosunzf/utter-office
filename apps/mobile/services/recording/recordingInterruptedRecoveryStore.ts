import * as SecureStore from "expo-secure-store";

export type InterruptedRecoveryState = {
  sessionId: string;
  sessionDir: string;
  recordingId: string;
  lastIndex: number;
  totalDurationMs: number;
  reason: string;
  savedAt: number;
};

const KEY = "utter_recording_interrupted_recovery";

export const recordingInterruptedRecoveryStore = {
  async get(): Promise<InterruptedRecoveryState | null> {
    const raw = await SecureStore.getItemAsync(KEY);
    if (!raw) return null;
    try {
      return JSON.parse(raw) as InterruptedRecoveryState;
    } catch {
      return null;
    }
  },

  async set(state: InterruptedRecoveryState): Promise<void> {
    await SecureStore.setItemAsync(KEY, JSON.stringify(state));
  },

  async clear(): Promise<void> {
    await SecureStore.deleteItemAsync(KEY);
  },
};

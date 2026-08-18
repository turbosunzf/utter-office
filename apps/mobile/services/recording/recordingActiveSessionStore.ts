import * as SecureStore from "expo-secure-store";
import type { ActiveSessionPointer } from "@/data/recording/recordingTypes";

const KEY = "utter_recording_active_session";

export const recordingActiveSessionStore = {
  async get(): Promise<ActiveSessionPointer | null> {
    const raw = await SecureStore.getItemAsync(KEY);
    if (!raw) return null;
    try {
      return JSON.parse(raw) as ActiveSessionPointer;
    } catch {
      return null;
    }
  },

  async set(pointer: ActiveSessionPointer): Promise<void> {
    await SecureStore.setItemAsync(KEY, JSON.stringify(pointer));
  },

  async clear(): Promise<void> {
    await SecureStore.deleteItemAsync(KEY);
  },
};

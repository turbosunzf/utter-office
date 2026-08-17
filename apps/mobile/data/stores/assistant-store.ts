/**
 * Assistant / secretary settings (PRD §8.4).
 * Default agent keyed by workspace id in SecureStore.
 */
import { useEffect } from "react";
import { create } from "zustand";
import * as SecureStore from "expo-secure-store";

const DEFAULT_AGENT_PREFIX = "utter_default_agent_id:";
const HOLD_MS_KEY = "utter_voice_hold_ms";
const HOLD_MS_MIGRATION_KEY = "utter_voice_hold_ms_v2";
const AUTO_JUMP_KEY = "utter_voice_auto_jump";
const VOICE_DEFAULT_KEY = "utter_voice_sheet_default";

export type VoiceSheetDefault = "record" | "translate" | "talk";
/** Hold-to-speak threshold. Default 500ms — short enough to feel instant,
 *  long enough that a light tap still opens the voice sheet. */
export type HoldThresholdMs = 500 | 1000 | 2000;

interface AssistantState {
  /** Map workspaceId → default agent id */
  defaultAgentByWs: Record<string, string>;
  holdThresholdMs: HoldThresholdMs;
  autoJumpWorkbench: boolean;
  voiceSheetDefault: VoiceSheetDefault;
  hydrated: boolean;
  hydrate: () => Promise<void>;
  setDefaultAgent: (wsId: string, agentId: string | null) => Promise<void>;
  setHoldThresholdMs: (ms: HoldThresholdMs) => Promise<void>;
  setAutoJumpWorkbench: (v: boolean) => Promise<void>;
  setVoiceSheetDefault: (v: VoiceSheetDefault) => Promise<void>;
}

export const useAssistantStore = create<AssistantState>((set, get) => ({
  defaultAgentByWs: {},
  holdThresholdMs: 500,
  autoJumpWorkbench: true,
  voiceSheetDefault: "talk",
  hydrated: false,

  hydrate: async () => {
    try {
      const hold = await SecureStore.getItemAsync(HOLD_MS_KEY);
      const holdMigrated = await SecureStore.getItemAsync(HOLD_MS_MIGRATION_KEY);
      const jump = await SecureStore.getItemAsync(AUTO_JUMP_KEY);
      const sheet = await SecureStore.getItemAsync(VOICE_DEFAULT_KEY);

      // One-shot: drop old 2s/3s default → 500ms. After that, honor settings.
      let holdMs: HoldThresholdMs = 500;
      if (!holdMigrated) {
        await SecureStore.setItemAsync(HOLD_MS_MIGRATION_KEY, "1");
        await SecureStore.setItemAsync(HOLD_MS_KEY, "500");
        holdMs = 500;
      } else if (hold === "500" || hold === "1000" || hold === "2000") {
        holdMs = Number(hold) as HoldThresholdMs;
      }

      set({
        holdThresholdMs: holdMs,
        autoJumpWorkbench: jump !== "0",
        voiceSheetDefault:
          sheet === "record" || sheet === "translate" || sheet === "talk"
            ? sheet
            : "talk",
        hydrated: true,
      });
    } catch {
      set({ hydrated: true });
    }
  },

  setDefaultAgent: async (wsId, agentId) => {
    const key = `${DEFAULT_AGENT_PREFIX}${wsId}`;
    if (!agentId) {
      await SecureStore.deleteItemAsync(key);
      const next = { ...get().defaultAgentByWs };
      delete next[wsId];
      set({ defaultAgentByWs: next });
      return;
    }
    await SecureStore.setItemAsync(key, agentId);
    set({
      defaultAgentByWs: { ...get().defaultAgentByWs, [wsId]: agentId },
    });
  },

  setHoldThresholdMs: async (ms) => {
    await SecureStore.setItemAsync(HOLD_MS_KEY, String(ms));
    set({ holdThresholdMs: ms });
  },

  setAutoJumpWorkbench: async (v) => {
    await SecureStore.setItemAsync(AUTO_JUMP_KEY, v ? "1" : "0");
    set({ autoJumpWorkbench: v });
  },

  setVoiceSheetDefault: async (v) => {
    await SecureStore.setItemAsync(VOICE_DEFAULT_KEY, v);
    set({ voiceSheetDefault: v });
  },
}));

/** Ensure default agent id for a workspace is loaded into the store. */
export async function loadDefaultAgentId(wsId: string): Promise<string | null> {
  try {
    const id = await SecureStore.getItemAsync(
      `${DEFAULT_AGENT_PREFIX}${wsId}`,
    );
    if (id) {
      useAssistantStore.setState((s) => ({
        defaultAgentByWs: { ...s.defaultAgentByWs, [wsId]: id },
      }));
    }
    return id;
  } catch {
    return null;
  }
}

export function useAssistantHydration(wsId: string | null) {
  const hydrate = useAssistantStore((s) => s.hydrate);
  const hydrated = useAssistantStore((s) => s.hydrated);

  useEffect(() => {
    void hydrate();
  }, [hydrate]);

  useEffect(() => {
    if (wsId) void loadDefaultAgentId(wsId);
  }, [wsId]);

  return hydrated;
}

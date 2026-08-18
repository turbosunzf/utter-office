import { api } from "@/data/api";
import type { AsrHandshakeResponse } from "./recordingTypes";

const USE_LIVE_ASR_API = false;

export const asrApi = {
  async handshake(recordingId: string): Promise<AsrHandshakeResponse> {
    if (USE_LIVE_ASR_API) {
      return api.asrRealtimeHandshake(recordingId);
    }
    return {
      wsUrl: "stub://asr",
      token: "stub-token",
      sessionId: recordingId,
    };
  },
};

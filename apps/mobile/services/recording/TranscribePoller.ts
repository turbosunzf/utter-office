import { TranscriptStore } from "./TranscriptStore";
import { USE_MOCK_RECORDING_CONTENT } from "@/data/mocks/recordings";

export const TranscribePoller = {
  async pollUntilReady(recordingId: string): Promise<void> {
    if (USE_MOCK_RECORDING_CONTENT) {
      await TranscriptStore.seedMock(recordingId);
      return;
    }
    // Live path would GET /app/recordings/:id/transcript with backoff.
    await TranscriptStore.seedMock(recordingId);
  },
};

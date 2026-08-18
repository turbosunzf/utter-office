import { queryOptions } from "@tanstack/react-query";
import { localRecordingRegistry } from "@/services/recording/RecordingLifecycleManager";
import { TranscriptStore } from "@/services/recording/TranscriptStore";
import { USE_MOCK_RECORDING_CONTENT } from "@/data/mocks/recordings";

export const recordingKeys = {
  all: (wsId: string | null) => ["recordings", wsId] as const,
  list: (wsId: string | null) => ["recordings", wsId, "list"] as const,
  detail: (wsId: string | null, id: string) =>
    ["recordings", wsId, "detail", id] as const,
  transcript: (id: string) => ["recordings", "transcript", id] as const,
};

export function recordingListOptions(wsId: string | null) {
  return queryOptions({
    queryKey: recordingKeys.list(wsId),
    queryFn: () => localRecordingRegistry.list(),
    enabled: !!wsId,
  });
}

export function recordingDetailOptions(wsId: string | null, id: string) {
  return queryOptions({
    queryKey: recordingKeys.detail(wsId, id),
    queryFn: async () => {
      const rec = await localRecordingRegistry.get(id);
      if (!rec) throw new Error("录音不存在");
      return rec;
    },
    enabled: !!wsId && !!id,
  });
}

export function transcriptOptions(id: string) {
  return queryOptions({
    queryKey: recordingKeys.transcript(id),
    queryFn: async () => {
      const bundle = await TranscriptStore.get(id);
      if (bundle) return bundle;
      if (USE_MOCK_RECORDING_CONTENT) return TranscriptStore.seedMock(id);
      throw new Error("转写尚未就绪");
    },
    enabled: !!id,
  });
}

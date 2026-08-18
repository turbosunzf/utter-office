import { useRecordingSessionApi } from "@/contexts/RecordingSessionContext";
import { useRecordingSessionContextStore } from "@/contexts/recordingSessionContextStore";
import { useRecordingSessionTimerStore } from "@/contexts/recordingSessionTimerStore";
import { useRecordingSessionUiStore } from "@/contexts/recordingSessionUiStore";
import { useRecordingAsrStore } from "@/contexts/recordingAsrStore";
import { formatClock } from "@/services/recording/recordingElapsed";

export function useAudioRecording() {
  const api = useRecordingSessionApi();
  const status = useRecordingSessionContextStore((s) => s.status);
  const stopping = useRecordingSessionContextStore((s) => s.stopping);
  const error = useRecordingSessionContextStore((s) => s.error);
  const elapsedSeconds = useRecordingSessionTimerStore((s) => s.elapsedSeconds);
  const peaks = useRecordingSessionUiStore((s) => s.peaks);
  const finals = useRecordingAsrStore((s) => s.finals);
  const partial = useRecordingAsrStore((s) => s.partial);

  return {
    status,
    stopping,
    error,
    elapsedSeconds,
    clock: formatClock(elapsedSeconds),
    peaks,
    finals,
    partial,
    isActive: status === "recording" || status === "paused" || status === "interrupted",
    isPaused: status === "paused" || status === "interrupted",
    start: api.start,
    pause: api.pause,
    resume: api.resume,
    stop: api.stop,
  };
}

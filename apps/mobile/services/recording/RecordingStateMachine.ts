import type { RecordingStatus } from "@/data/recording/recordingTypes";

const ALLOWED: Record<RecordingStatus, RecordingStatus[]> = {
  idle: ["recording"],
  recording: ["paused", "interrupted", "stopping", "failed"],
  paused: ["recording", "stopping", "failed", "interrupted"],
  interrupted: ["recording", "paused", "stopping", "failed"],
  stopping: ["stopped", "failed"],
  stopped: ["idle", "recording"],
  failed: ["idle", "recording"],
};

export function canTransition(
  from: RecordingStatus,
  to: RecordingStatus,
): boolean {
  return ALLOWED[from]?.includes(to) ?? false;
}

export function transition(
  from: RecordingStatus,
  to: RecordingStatus,
): RecordingStatus {
  if (from === to) return to;
  if (!canTransition(from, to)) return from;
  return to;
}

export const RecordingStateMachine = { canTransition, transition };

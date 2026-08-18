import type { RecordingVolume } from "@/data/recording/recordingTypes";

export type PlaybackPlan = {
  volumes: RecordingVolume[];
  durationMs: number;
};

/** Map a global seek position onto the correct volume file. */
export function volumeAt(
  plan: PlaybackPlan,
  positionMs: number,
): { volume: RecordingVolume; offsetMs: number } | null {
  let cursor = 0;
  for (const volume of plan.volumes) {
    const next = cursor + volume.durationMs;
    if (positionMs < next || volume === plan.volumes[plan.volumes.length - 1]) {
      return { volume, offsetMs: Math.max(0, positionMs - cursor) };
    }
    cursor = next;
  }
  return plan.volumes[0]
    ? { volume: plan.volumes[0], offsetMs: 0 }
    : null;
}

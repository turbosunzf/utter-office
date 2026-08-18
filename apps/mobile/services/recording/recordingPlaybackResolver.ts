import type { LocalRecording } from "@/data/recording/recordingTypes";
import { volumeAt, type PlaybackPlan } from "@/lib/recording/playback";
import { loadVolumes } from "./encryptedSessionMaintenance";
import { fileUri } from "./recordingFs";

export type { PlaybackPlan };
export { volumeAt };

export async function resolvePlayback(
  recording: Pick<LocalRecording, "sessionDir" | "volumes" | "durationMs">,
): Promise<PlaybackPlan> {
  if (recording.volumes.length > 0) {
    return {
      volumes: recording.volumes.map((v) => ({
        ...v,
        uri: fileUri(v.uri.replace(/^file:\/\//, "")),
      })),
      durationMs: recording.durationMs,
    };
  }
  const manifest = await loadVolumes(recording.sessionDir);
  return {
    volumes: manifest.volumes,
    durationMs:
      recording.durationMs ||
      manifest.volumes.reduce((n, v) => n + v.durationMs, 0),
  };
}

export const recordingPlaybackResolver = {
  resolvePlayback,
  volumeAt,
};

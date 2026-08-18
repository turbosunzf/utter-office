import type { EventSubscription } from "expo-modules-core";
import native, {
  getEncryptedRecordingNative,
  type EncryptedRecordingEvents,
  type ForceStopEvent,
  type MemoryPressureEvent,
  type MergeSkippedEvent,
  type RealtimePcmFrameEvent,
  type RecordingErrorEvent,
  type RecordingLevelEvent,
  type RecordingStateEvent,
  type RecordingStoppedEvent,
  type RecordingTickEvent,
  type SegmentSealedEvent,
  type SystemInterruptEndedEvent,
  type SystemInterruptedEvent,
} from "encrypted-recording";

export {
  type ForceStopEvent,
  type MemoryPressureEvent,
  type MergeSkippedEvent,
  type RealtimePcmFrameEvent,
  type RecordingErrorEvent,
  type RecordingLevelEvent,
  type RecordingStateEvent,
  type RecordingStoppedEvent,
  type RecordingTickEvent,
  type SegmentSealedEvent,
  type SystemInterruptEndedEvent,
  type SystemInterruptedEvent,
};

export function isNativeRecordingAvailable(): boolean {
  return getEncryptedRecordingNative() != null;
}

function requireNative() {
  const mod = getEncryptedRecordingNative();
  if (!mod) {
    throw new Error("EncryptedRecording native module is unavailable");
  }
  return mod;
}

export async function getOrCreateMasterKey(): Promise<string> {
  return requireNative().getOrCreateMasterKey();
}

export async function startEncryptedRecording(
  sessionDir: string,
  masterKey: string,
  startIndex: number,
  baseDurationMs: number,
): Promise<void> {
  await requireNative().startEncryptedRecording(
    sessionDir,
    masterKey,
    startIndex,
    baseDurationMs,
  );
}

export function pauseRecording(): void {
  requireNative().pauseRecording();
}

export function resumeRecording(): void {
  requireNative().resumeRecording();
}

export async function stopAndSeal(): Promise<{
  status: string;
  elapsedMs: number;
}> {
  return requireNative().stopEncryptedRecording();
}

export function isRecording(): boolean {
  try {
    return requireNative().isRecording();
  } catch {
    return false;
  }
}

export async function getRecordingRuntimeState() {
  return requireNative().getRecordingRuntimeState();
}

export async function reconcileSession(sessionDir: string, masterKey: string) {
  return requireNative().reconcileSession(sessionDir, masterKey);
}

export async function exportPlainM4a(
  keyBase64: string,
  segmentPaths: string[],
  outputPath: string,
) {
  return requireNative().exportPlainM4a(keyBase64, segmentPaths, outputPath);
}

export function canDrawOverlays(): boolean {
  try {
    return requireNative().canDrawOverlays();
  } catch {
    return true;
  }
}

export function isOverlayEnabled(): boolean {
  try {
    return requireNative().isOverlayEnabled();
  } catch {
    return false;
  }
}

export function openOverlaySettings(): void {
  requireNative().openOverlaySettings();
}

export function setOverlayEnabled(enabled: boolean): void {
  requireNative().setOverlayEnabled(enabled);
}

export async function freeBytes(path: string): Promise<number> {
  return requireNative().freeBytes(path);
}

export function addRecordingListener<K extends keyof EncryptedRecordingEvents>(
  event: K,
  listener: EncryptedRecordingEvents[K],
): EventSubscription {
  const mod = native ?? requireNative();
  return mod.addListener(event, listener as never);
}

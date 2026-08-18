import { NativeModule, requireNativeModule } from "expo-modules-core";

export type RecordingTickEvent = { elapsedSeconds: number };
export type RecordingStoppedEvent = {
  status: string;
  path: string;
  fileSize: number;
  errorCode: string;
};
export type RecordingErrorEvent = { code: string; message: string };
export type RealtimePcmFrameEvent = { base64: string; bytes: number };
export type SystemInterruptedEvent = {
  reason: string;
  elapsedSeconds: number;
  segmentCount: number;
  autoPaused: boolean;
};
export type SystemInterruptEndedEvent = { canResume: boolean };
export type MergeSkippedEvent = { reason?: string };
export type MemoryPressureEvent = { level: string };
export type ForceStopEvent = {
  reason: string;
  path: string;
  segmentPaths: string[];
};
export type SegmentSealedEvent = {
  index: number;
  file: string;
  nonce: string;
  sampleCount: number;
  durationMs: number;
  byteLength: number;
  tag: string;
};
export type RecordingStateEvent = { state: string };
export type RecordingLevelEvent = { level: number };

export type EncryptedRecordingEvents = {
  onRecordingTick: (event: RecordingTickEvent) => void;
  onRecordingStopped: (event: RecordingStoppedEvent) => void;
  onRecordingError: (event: RecordingErrorEvent) => void;
  onRealtimePcmFrame: (event: RealtimePcmFrameEvent) => void;
  onAppResumedWhileRecording: () => void;
  onRecordingSystemInterrupted: (event: SystemInterruptedEvent) => void;
  onRecordingSystemInterruptEnded: (event: SystemInterruptEndedEvent) => void;
  onRecordingMergeSkipped: (event: MergeSkippedEvent) => void;
  onRecordingMemoryPressure: (event: MemoryPressureEvent) => void;
  onRecordingForceStop: (event: ForceStopEvent) => void;
  onSegmentSealed: (event: SegmentSealedEvent) => void;
  onRecordingState: (event: RecordingStateEvent) => void;
  onRecordingLevel: (event: RecordingLevelEvent) => void;
};

declare class EncryptedRecordingNativeModule extends NativeModule<EncryptedRecordingEvents> {
  getOrCreateMasterKey(): Promise<string>;
  startEncryptedRecording(
    sessionDir: string,
    masterKey: string,
    startIndex: number,
    baseDurationMs: number,
  ): Promise<void>;
  pauseRecording(): void;
  resumeRecording(): void;
  stopEncryptedRecording(): Promise<{ status: string; elapsedMs: number }>;
  isRecording(): boolean;
  getRecordingRuntimeState(): Promise<{
    isRecording: boolean;
    hasFiles: boolean;
    sessionDir: string;
    lastIndex: number;
  }>;
  reconcileSession(
    sessionDir: string,
    masterKey: string,
  ): Promise<{
    sessionId: string;
    state: string;
    totalDurationMs: number;
    segmentCount: number;
    lastIndex: number;
  }>;
  exportPlainM4a(
    keyBase64: string,
    segmentPaths: string[],
    outputPath: string,
  ): Promise<{ path: string; byteLength: number }>;
  canDrawOverlays(): boolean;
  isOverlayEnabled(): boolean;
  openOverlaySettings(): void;
  setOverlayEnabled(enabled: boolean): void;
  freeBytes(path: string): Promise<number>;
}

let native: EncryptedRecordingNativeModule | null = null;
try {
  native = requireNativeModule<EncryptedRecordingNativeModule>(
    "EncryptedRecording",
  );
} catch {
  native = null;
}

export function getEncryptedRecordingNative(): EncryptedRecordingNativeModule | null {
  return native;
}

export default native;

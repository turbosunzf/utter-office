import { Platform, Alert } from "react-native";
import {
  ASR_STOP_MS,
  STOP_TOTAL_TIMEOUT_MS,
} from "@/native/recording/encryptedRecordingSpec";
import {
  canDrawOverlays,
  getOrCreateMasterKey,
  openOverlaySettings,
  pauseRecording,
  resumeRecording,
  startEncryptedRecording,
  stopAndSeal,
} from "@/native/recording/RecordingBridge";
import { recordingApi } from "@/data/recording/recordingApi";
import type { LocalRecording } from "@/data/recording/recordingTypes";
import {
  requestMicrophonePermission,
} from "./microphonePermission";
import { requestCameraPermission } from "./cameraPermission";
import {
  buildSessionDir,
  defaultRecordingTitle,
  newSessionId,
} from "./recordingSessionMeta";
import { RecordingMonitor } from "./RecordingMonitor";
import { recordingActiveSessionStore } from "./recordingActiveSessionStore";
import { invalidateMergeArtifacts, mergeTail } from "./encryptedSessionMaintenance";
import { realtimeAsrService } from "./realtime/RealtimeAsrService";
import { TranscribePoller } from "./TranscribePoller";
import { UploadPipeline, UploadQueueStore } from "./UploadQueueStore";
import { localRecordingRegistry } from "./RecordingLifecycleManager";

export async function ensureOverlayPermission(): Promise<void> {
  if (Platform.OS !== "android") return;
  if (canDrawOverlays()) return;
  Alert.alert(
    "悬浮窗权限",
    "录制中可在其他 App 上方显示计时条。前往系统设置开启「显示在其他应用的上层」。",
    [
      { text: "稍后再说", style: "cancel" },
      { text: "去设置", onPress: () => openOverlaySettings() },
    ],
  );
}

export async function beginEncryptedSession(opts: {
  title?: string;
  startIndex?: number;
  baseDurationMs?: number;
  sessionId?: string;
  recordingId?: string;
}): Promise<{
  sessionId: string;
  sessionDir: string;
  recordingId: string;
  masterKey: string;
  title: string;
}> {
  const gate = await RecordingMonitor.checkStartGates();
  if (gate) {
    RecordingMonitor.alertGate(gate);
    throw new Error(gate);
  }
  const allowed = await requestMicrophonePermission();
  if (!allowed) {
    throw new Error("microphone");
  }
  // Camera is for in-recording photos; denial must not block the session.
  await requestCameraPermission({ silent: true });
  await ensureOverlayPermission();

  const sessionId = opts.sessionId ?? newSessionId();
  const sessionDir = buildSessionDir(sessionId);
  const created = opts.recordingId
    ? { id: opts.recordingId }
    : await recordingApi.createRecording({ title: opts.title });
  const masterKey = await getOrCreateMasterKey();
  const title = opts.title ?? defaultRecordingTitle();

  await startEncryptedRecording(
    sessionDir,
    masterKey,
    opts.startIndex ?? 0,
    opts.baseDurationMs ?? 0,
  );
  await recordingActiveSessionStore.set({
    sessionId,
    sessionDir,
    recordingId: created.id,
    startedAt: Date.now(),
    lastIndex: (opts.startIndex ?? 0) - 1,
    totalDurationMs: opts.baseDurationMs ?? 0,
    accumulatedPauseMs: 0,
    title,
  });
  return {
    sessionId,
    sessionDir,
    recordingId: created.id,
    masterKey,
    title,
  };
}

export function pauseEncryptedSession(): void {
  pauseRecording();
  void realtimeAsrService.stopBestEffort(ASR_STOP_MS);
}

export async function resumeEncryptedSession(sessionDir: string): Promise<void> {
  await invalidateMergeArtifacts(sessionDir);
  resumeRecording();
}

export async function stopEncryptedSession(opts: {
  sessionDir: string;
  masterKey: string;
  recordingId: string;
  title: string;
  sealed: { file: string; index: number; durationMs: number }[];
  durationMs: number;
}): Promise<LocalRecording> {
  pauseRecording();
  await realtimeAsrService.stopBestEffort(ASR_STOP_MS);

  const stopWork = async () => {
    await stopAndSeal();
    const volumes = await mergeTail({
      sessionDir: opts.sessionDir,
      masterKey: opts.masterKey,
      sealed: opts.sealed,
    });
    return volumes;
  };

  const volumes = await Promise.race([
    stopWork(),
    new Promise<never>((_, reject) =>
      setTimeout(() => reject(new Error("stop-timeout")), STOP_TOTAL_TIMEOUT_MS),
    ),
  ]);

  const recording: LocalRecording = {
    id: opts.recordingId,
    sessionId: opts.sessionDir.split("/").filter(Boolean).pop() ?? opts.recordingId,
    sessionDir: opts.sessionDir,
    title: opts.title,
    durationMs: opts.durationMs,
    createdAt: Date.now(),
    volumes: volumes.volumes,
    transcriptReady: false,
    isSampleContent: true,
  };
  await localRecordingRegistry.upsert(recording);
  const first = volumes.volumes[0];
  if (first) {
    await UploadQueueStore.enqueue({
      recordingId: recording.id,
      fileUri: first.uri,
      status: "pending",
    });
    void UploadPipeline.drain();
  }
  await TranscribePoller.pollUntilReady(recording.id);
  recording.transcriptReady = true;
  await localRecordingRegistry.upsert(recording);
  await recordingActiveSessionStore.clear();
  return recording;
}

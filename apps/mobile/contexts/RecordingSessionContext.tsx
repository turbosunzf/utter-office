import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  type ReactNode,
} from "react";
import { Alert } from "react-native";
import { router } from "expo-router";
import { INTERRUPT_POLL_MS } from "@/native/recording/encryptedRecordingSpec";
import {
  addRecordingListener,
  getRecordingRuntimeState,
  isNativeRecordingAvailable,
  reconcileSession,
} from "@/native/recording/RecordingBridge";
import { useWorkspaceStore } from "@/data/workspace-store";
import { RecordingMonitor } from "@/services/recording/RecordingMonitor";
import { RecoveryCoordinator } from "@/services/recording/RecoveryCoordinator";
import { recordingActiveSessionStore } from "@/services/recording/recordingActiveSessionStore";
import {
  recordingInterruptedRecoveryStore,
} from "@/services/recording/recordingInterruptedRecoveryStore";
import { maybeMergeVolume } from "@/services/recording/encryptedSessionMaintenance";
import { realtimeAsrService } from "@/services/recording/realtime/RealtimeAsrService";
import { UploadPipeline } from "@/services/recording/UploadPipeline";
import { peaksFromLevel } from "@/services/recording/waveformPeaksService";
import {
  beginEncryptedSession,
  pauseEncryptedSession,
  resumeEncryptedSession,
  stopEncryptedSession,
} from "@/services/recording/sessionCommands";
import { useRecordingSessionContextStore } from "./recordingSessionContextStore";
import { useRecordingSessionTimerStore } from "./recordingSessionTimerStore";
import { useRecordingSessionUiStore } from "./recordingSessionUiStore";
import { useRecordingAsrStore } from "./recordingAsrStore";
import { useRecordingReliabilityStore } from "./recordingReliabilityStore";

type RecordingApi = {
  start: (title?: string) => Promise<void>;
  pause: () => void;
  resume: () => Promise<void>;
  stop: () => Promise<string | null>;
  acceptRecovery: () => Promise<void>;
  dismissRecovery: () => Promise<void>;
};

const RecordingApiContext = createContext<RecordingApi | null>(null);

export function RecordingSessionProvider({ children }: { children: ReactNode }) {
  const monitorRef = useRef<ReturnType<typeof RecordingMonitor.startRecordingMonitor> | null>(
    null,
  );
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const sealedRef = useRef(useRecordingSessionContextStore.getState().sealed);

  useEffect(() => {
    return useRecordingSessionContextStore.subscribe((s) => {
      sealedRef.current = s.sealed;
    });
  }, []);

  const bindAsr = useCallback((recordingId: string) => {
    void realtimeAsrService.start(recordingId, {
      onPartial: (p) => useRecordingAsrStore.getState().setPartial(p),
      onFinal: (f) => {
        useRecordingAsrStore.getState().setPartial(null);
        useRecordingAsrStore.getState().pushFinal(f);
      },
    });
  }, []);

  const start = useCallback(async (title?: string) => {
    const current = useRecordingSessionContextStore.getState().status;
    if (
      current === "recording" ||
      current === "paused" ||
      current === "interrupted" ||
      current === "stopping"
    ) {
      return;
    }
    const session = await beginEncryptedSession({ title });
    useRecordingSessionContextStore.getState().patch({
      status: "recording",
      sessionId: session.sessionId,
      sessionDir: session.sessionDir,
      recordingId: session.recordingId,
      masterKey: session.masterKey,
      title: session.title,
      sealed: [],
      error: null,
      stopping: false,
    });
    useRecordingSessionTimerStore.getState().begin(0);
    useRecordingSessionUiStore.getState().setBannerVisible(true);
    useRecordingAsrStore.getState().reset();
    bindAsr(session.recordingId);
    monitorRef.current?.stop();
    monitorRef.current = RecordingMonitor.startRecordingMonitor({
      getElapsedSeconds: () =>
        useRecordingSessionTimerStore.getState().elapsedSeconds,
      onLowStorage: () => {
        void stop();
      },
      onMaxDuration: () => {
        void stop();
      },
    });
  }, [bindAsr]);

  const pause = useCallback(() => {
    pauseEncryptedSession();
    useRecordingSessionContextStore.getState().setStatus("paused");
    useRecordingSessionTimerStore.getState().markPause();
  }, []);

  const resume = useCallback(async () => {
    const { sessionDir, recordingId } = useRecordingSessionContextStore.getState();
    if (!sessionDir) return;
    await resumeEncryptedSession(sessionDir);
    useRecordingSessionContextStore.getState().setStatus("recording");
    useRecordingSessionTimerStore.getState().markResume();
    if (recordingId) bindAsr(recordingId);
  }, [bindAsr]);

  const stop = useCallback(async (): Promise<string | null> => {
    const ctx = useRecordingSessionContextStore.getState();
    if (!ctx.sessionDir || !ctx.masterKey || !ctx.recordingId) return null;
    useRecordingSessionContextStore.getState().patch({
      status: "stopping",
      stopping: true,
    });
    monitorRef.current?.stop();
    try {
      const durationMs =
        useRecordingSessionTimerStore.getState().elapsedSeconds * 1000;
      const recording = await stopEncryptedSession({
        sessionDir: ctx.sessionDir,
        masterKey: ctx.masterKey,
        recordingId: ctx.recordingId,
        title: ctx.title,
        sealed: sealedRef.current,
        durationMs,
      });
      useRecordingSessionContextStore.getState().reset();
      useRecordingSessionTimerStore.getState().reset();
      useRecordingSessionUiStore.getState().setBannerVisible(false);
      useRecordingAsrStore.getState().reset();
      return recording.id;
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      useRecordingSessionContextStore.getState().patch({
        status: "failed",
        stopping: false,
        error: message,
      });
      useRecordingReliabilityStore.getState().setError(message);
      Alert.alert("停止录音失败", message === "stop-timeout" ? "导出超时，请重试。" : message);
      return null;
    }
  }, []);

  const acceptRecovery = useCallback(async () => {
    const recovery = useRecordingSessionUiStore.getState().recovery;
    if (!recovery) return;
    const masterKey = useRecordingSessionContextStore.getState().masterKey
      ?? (await import("@/native/recording/RecordingBridge")).getOrCreateMasterKey();
    const key = typeof masterKey === "string" ? masterKey : await masterKey;
    await reconcileSession(recovery.sessionDir, key);
    const session = await beginEncryptedSession({
      sessionId: recovery.sessionId,
      recordingId: recovery.recordingId,
      startIndex: recovery.lastIndex + 1,
      baseDurationMs: recovery.totalDurationMs,
    });
    useRecordingSessionContextStore.getState().patch({
      status: "recording",
      sessionId: session.sessionId,
      sessionDir: session.sessionDir,
      recordingId: session.recordingId,
      masterKey: session.masterKey,
      title: session.title,
      sealed: [],
      error: null,
    });
    useRecordingSessionTimerStore.getState().begin(recovery.totalDurationMs);
    useRecordingSessionUiStore.getState().setRecovery(null);
    useRecordingSessionUiStore.getState().setBannerVisible(true);
    await recordingInterruptedRecoveryStore.clear();
    bindAsr(session.recordingId);
  }, [bindAsr]);

  const dismissRecovery = useCallback(async () => {
    const recovery = useRecordingSessionUiStore.getState().recovery;
    useRecordingSessionUiStore.getState().setRecovery(null);
    await recordingInterruptedRecoveryStore.clear();
    await recordingActiveSessionStore.clear();
    if (!recovery) return;
    const slug = useWorkspaceStore.getState().currentWorkspaceSlug;
    if (slug) router.push(`/${slug}/recordings/${recovery.recordingId}`);
  }, []);

  useEffect(() => {
    if (!isNativeRecordingAvailable()) return;

    const subs = [
      addRecordingListener("onRecordingTick", (e) => {
        useRecordingSessionTimerStore.getState().setElapsed(e.elapsedSeconds);
      }),
      addRecordingListener("onRecordingStopped", () => {
        useRecordingSessionUiStore.getState().setBannerVisible(false);
      }),
      addRecordingListener("onRecordingError", (e) => {
        useRecordingReliabilityStore.getState().setError(e.message);
        useRecordingSessionContextStore.getState().patch({
          status: "failed",
          error: e.message,
        });
      }),
      addRecordingListener("onRealtimePcmFrame", (e) => {
        realtimeAsrService.handlePcmFrame(e.base64);
      }),
      addRecordingListener("onAppResumedWhileRecording", () => {
        useRecordingSessionUiStore.getState().setBannerVisible(true);
      }),
      addRecordingListener("onRecordingSystemInterrupted", (e) => {
        useRecordingSessionContextStore.getState().setStatus("interrupted");
        useRecordingSessionTimerStore.getState().markPause();
        useRecordingReliabilityStore.getState().setInterrupt(e.reason);
        useRecordingReliabilityStore.getState().setInterruptPolling(true);
        void realtimeAsrService.stopBestEffort(1500);
        const ctx = useRecordingSessionContextStore.getState();
        if (ctx.sessionId && ctx.sessionDir && ctx.recordingId) {
          void recordingInterruptedRecoveryStore.set({
            sessionId: ctx.sessionId,
            sessionDir: ctx.sessionDir,
            recordingId: ctx.recordingId,
            lastIndex: e.segmentCount,
            totalDurationMs: e.elapsedSeconds * 1000,
            reason: e.reason,
            savedAt: Date.now(),
          });
        }
        if (pollRef.current) clearInterval(pollRef.current);
        pollRef.current = setInterval(() => {
          void getRecordingRuntimeState();
        }, INTERRUPT_POLL_MS);
      }),
      addRecordingListener("onRecordingSystemInterruptEnded", (e) => {
        useRecordingReliabilityStore.getState().setInterruptPolling(false);
        if (pollRef.current) {
          clearInterval(pollRef.current);
          pollRef.current = null;
        }
        if (e.canResume) {
          void resume();
        }
      }),
      addRecordingListener("onRecordingMergeSkipped", () => {}),
      addRecordingListener("onRecordingMemoryPressure", (e) => {
        useRecordingReliabilityStore.getState().setMemoryPressure(e.level);
      }),
      addRecordingListener("onRecordingForceStop", () => {
        void stop();
      }),
      addRecordingListener("onSegmentSealed", (e) => {
        const sealed = [
          ...useRecordingSessionContextStore.getState().sealed,
          { file: e.file, index: e.index, durationMs: e.durationMs },
        ];
        useRecordingSessionContextStore.getState().patch({
          sealed,
          lastIndex: e.index,
        });
        const ctx = useRecordingSessionContextStore.getState();
        if (ctx.sessionDir && ctx.masterKey) {
          void maybeMergeVolume({
            sessionDir: ctx.sessionDir,
            masterKey: ctx.masterKey,
            sealed,
          });
        }
        void recordingActiveSessionStore.get().then((p) => {
          if (!p) return;
          void recordingActiveSessionStore.set({
            ...p,
            lastIndex: e.index,
            totalDurationMs: p.totalDurationMs + e.durationMs,
          });
        });
      }),
      addRecordingListener("onRecordingState", (e) => {
        if (e.state === "paused") {
          useRecordingSessionContextStore.getState().setStatus("paused");
        }
        if (e.state === "recording") {
          useRecordingSessionContextStore.getState().setStatus("recording");
        }
      }),
      addRecordingListener("onRecordingLevel", (e) => {
        const prev = useRecordingSessionUiStore.getState().peaks;
        useRecordingSessionUiStore.getState().setPeaks(peaksFromLevel(e.level, prev));
      }),
    ];

    void RecoveryCoordinator.run(async () => {
      void UploadPipeline.drain();
      const active = await recordingActiveSessionStore.get();
      if (!active) {
        const interrupted = await recordingInterruptedRecoveryStore.get();
        if (interrupted) {
          useRecordingSessionUiStore.getState().setRecovery(interrupted);
        }
        return;
      }
      const native = await getRecordingRuntimeState();
      if (native.isRecording) {
        useRecordingSessionContextStore.getState().patch({
          status: "recording",
          sessionId: active.sessionId,
          sessionDir: active.sessionDir,
          recordingId: active.recordingId,
          title: active.title,
        });
        useRecordingSessionTimerStore.getState().begin(active.totalDurationMs);
        useRecordingSessionUiStore.getState().setBannerVisible(true);
        const slug = useWorkspaceStore.getState().currentWorkspaceSlug;
        if (slug) router.push(`/${slug}/voice-record`);
      } else if (native.hasFiles) {
        useRecordingSessionUiStore.getState().setRecovery({
          sessionId: active.sessionId,
          sessionDir: active.sessionDir,
          recordingId: active.recordingId,
          lastIndex: native.lastIndex,
          totalDurationMs: active.totalDurationMs,
          reason: "process-killed",
          savedAt: Date.now(),
        });
      }
    });

    return () => {
      subs.forEach((s) => s.remove());
      monitorRef.current?.stop();
      if (pollRef.current) clearInterval(pollRef.current);
    };
  }, [resume, stop]);

  const api = useMemo<RecordingApi>(
    () => ({ start, pause, resume, stop, acceptRecovery, dismissRecovery }),
    [start, pause, resume, stop, acceptRecovery, dismissRecovery],
  );

  return (
    <RecordingApiContext.Provider value={api}>
      {children}
    </RecordingApiContext.Provider>
  );
}

export function useRecordingSessionApi(): RecordingApi {
  const ctx = useContext(RecordingApiContext);
  if (!ctx) {
    throw new Error("useRecordingSessionApi must be used within RecordingSessionProvider");
  }
  return ctx;
}

import * as Battery from "expo-battery";
import { Alert } from "react-native";
import {
  MAX_RECORDING_SECONDS,
  MIN_BATTERY_PERCENT,
  MIN_FREE_STORAGE,
  RUNTIME_LOW_STORAGE,
} from "@/native/recording/encryptedRecordingSpec";
import { availableBytes, recRoot } from "./recordingFs";
import { freeBytes } from "@/native/recording/RecordingBridge";

export type GateFailure = "battery" | "storage" | "duration";

export async function checkStartGates(): Promise<GateFailure | null> {
  const level = await Battery.getBatteryLevelAsync();
  if (level >= 0 && level * 100 < MIN_BATTERY_PERCENT) return "battery";
  const free = availableBytes();
  if (free < MIN_FREE_STORAGE) return "storage";
  return null;
}

export async function checkRuntimeStorage(): Promise<boolean> {
  try {
    const free = await freeBytes(recRoot().uri.replace(/^file:\/\//, ""));
    return free >= RUNTIME_LOW_STORAGE;
  } catch {
    return availableBytes() >= RUNTIME_LOW_STORAGE;
  }
}

export function isOverMaxDuration(elapsedSeconds: number): boolean {
  return elapsedSeconds >= MAX_RECORDING_SECONDS;
}

export function explainGate(failure: GateFailure): string {
  if (failure === "battery") return "电量低于 5%，请充电后再录。";
  if (failure === "storage") return "可用存储不足 300MB，请清理后再录。";
  return "已达到最长 6 小时录音限制。";
}

export function alertGate(failure: GateFailure): void {
  Alert.alert("无法开始录音", explainGate(failure));
}

export type RecordingMonitorHandle = {
  stop: () => void;
};

export function startRecordingMonitor(opts: {
  onLowStorage: () => void;
  getElapsedSeconds: () => number;
  onMaxDuration: () => void;
}): RecordingMonitorHandle {
  const id = setInterval(() => {
    void (async () => {
      const ok = await checkRuntimeStorage();
      if (!ok) opts.onLowStorage();
      if (isOverMaxDuration(opts.getElapsedSeconds())) opts.onMaxDuration();
    })();
  }, 15_000);
  return { stop: () => clearInterval(id) };
}

export const RecordingMonitor = {
  checkStartGates,
  checkRuntimeStorage,
  startRecordingMonitor,
  alertGate,
};

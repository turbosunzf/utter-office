import { sessionDirectory } from "./recordingFs";

export function newSessionId(): string {
  const bytes = new Uint8Array(16);
  for (let i = 0; i < bytes.length; i++) {
    bytes[i] = Math.floor(Math.random() * 256);
  }
  return Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("");
}

export function buildSessionDir(sessionId: string): string {
  const dir = sessionDirectory(sessionId);
  return dir.uri.replace(/^file:\/\//, "");
}

export function defaultRecordingTitle(at = Date.now()): string {
  const d = new Date(at);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `会议录音 ${d.getMonth() + 1}/${d.getDate()} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

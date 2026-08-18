import type { RealtimeAsrMessage } from "./types";

export function parseAsrMessage(raw: string): RealtimeAsrMessage | null {
  try {
    const obj = JSON.parse(raw) as RealtimeAsrMessage;
    if (!obj || typeof obj !== "object" || !("type" in obj)) return null;
    return obj;
  } catch {
    return null;
  }
}

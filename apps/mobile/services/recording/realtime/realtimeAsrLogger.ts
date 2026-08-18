export function logAsr(event: string, extra?: Record<string, unknown>): void {
  if (__DEV__) {
    console.log(`[realtime-asr] ${event}`, extra ?? "");
  }
}

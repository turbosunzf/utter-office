export function formatClock(totalSeconds: number): string {
  const h = Math.floor(totalSeconds / 3600);
  const m = Math.floor((totalSeconds % 3600) / 60);
  const s = totalSeconds % 60;
  const ss = String(s).padStart(2, "0");
  if (h > 0) return `${h}:${String(m).padStart(2, "0")}:${ss}`;
  return `${m}:${ss}`;
}

export function elapsedFromBase(
  baseDurationMs: number,
  startedAt: number,
  accumulatedPauseMs: number,
  now = Date.now(),
  pausedAt: number | null = null,
): number {
  const livePause = pausedAt ? now - pausedAt : 0;
  return Math.max(
    0,
    Math.floor((baseDurationMs + (now - startedAt) - accumulatedPauseMs - livePause) / 1000),
  );
}

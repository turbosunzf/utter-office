/**
 * Compact number formatting for the 看板 (board) tab — hero metrics and
 * per-agent captions (tasks / tokens / failures). Keeps large values on one
 * line (`1.2k`, `3.4M`) instead of a raw digit wall.
 */
export function formatCompact(n: number): string {
  if (n < 1000) return String(n);
  if (n < 1_000_000) {
    const k = n / 1000;
    return `${k >= 100 ? Math.round(k) : k.toFixed(1)}k`;
  }
  const m = n / 1_000_000;
  return `${m >= 100 ? Math.round(m) : m.toFixed(1)}M`;
}

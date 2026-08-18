const PEAK_COUNT = 24;

export function peaksFromLevel(level: number, previous: number[]): number[] {
  const next = [...previous, Math.max(0.08, Math.min(1, level))];
  if (next.length > PEAK_COUNT) next.splice(0, next.length - PEAK_COUNT);
  return next;
}

export function idlePeaks(): number[] {
  return Array.from({ length: PEAK_COUNT }, () => 0.12);
}

export const waveformPeaksService = { peaksFromLevel, idlePeaks };

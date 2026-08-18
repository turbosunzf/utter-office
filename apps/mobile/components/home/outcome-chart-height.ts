/**
 * 工作成果图：纵向尺寸 + token → 高度。
 * 改 TRACK / PIN 即可整体变高变矮；usage 映射只走这里。
 */
export const OUTCOME_CHART_HEIGHT = {
  /** 头像直径，同时是曲线上方留白。 */
  pin: 16,
  /** 曲线轨道高度（含 pad）。原 72，按需求减半。 */
  track: 36,
  /** 曲线距顶/底的内边距。 */
  pad: 3,
  /** 小用量保底振幅（相对 track 可用高）。 */
  floor: 0.36,
  /** <1：大用量增高变慢，封顶 1。 */
  power: 0.42,
  /** spark 波形在振幅内的下限 / 跨度。 */
  sparkFloor: 0.42,
  sparkSpan: 0.58,
} as const;

export const OUTCOME_CHART_SVG_H =
  OUTCOME_CHART_HEIGHT.pin + OUTCOME_CHART_HEIGHT.track;

export function outcomeUsageUnit(
  sparkVal: number,
  tokens: number,
  maxTokens: number,
): number {
  const { floor, power, sparkFloor, sparkSpan } = OUTCOME_CHART_HEIGHT;
  const ratio = Math.max(0, Math.min(1, tokens / Math.max(1, maxTokens)));
  const amp = floor + (1 - floor) * Math.pow(ratio, power);
  const shape =
    sparkFloor + sparkSpan * Math.max(0.08, Math.min(1, sparkVal));
  return Math.min(1, amp * shape);
}

export function outcomeUsageY(unit: number, yBase: number): number {
  const { pad, track } = OUTCOME_CHART_HEIGHT;
  const usable = track - pad * 2;
  return yBase - pad - Math.min(1, Math.max(0, unit)) * usable;
}

import { describe, expect, it } from "vitest";
import {
  concatBytes,
  endOfLastCompleteFrame,
  findLastCompleteAdtsFrame,
  makeAdtsFrame,
} from "./adts";

function frame(seed: number, payloadLen = 40): Uint8Array {
  const payload = new Uint8Array(payloadLen);
  payload.fill(seed);
  return makeAdtsFrame(payload);
}

describe("ADTS truncation recovery (H6)", () => {
  it("finds the last complete frame after a random tail cut", () => {
    const frames = [frame(1), frame(2), frame(3, 80)];
    const complete = concatBytes(frames);
    const truncated = complete.subarray(0, complete.length - 11);
    const start = findLastCompleteAdtsFrame(truncated);
    const end = endOfLastCompleteFrame(truncated);
    expect(end).toBeGreaterThan(0);
    expect(end).toBeLessThanOrEqual(truncated.length);
    expect(start).toBe(frames[0]!.length);
    expect(end).toBe(frames[0]!.length + frames[1]!.length);
  });

  it("keeps duration aligned with complete-frame count", () => {
    const frames = [frame(1), frame(2), frame(3), frame(4)];
    const complete = concatBytes(frames);
    const cut = complete.subarray(0, complete.length - 3);
    const end = endOfLastCompleteFrame(cut);
    const recovered = cut.subarray(0, end);
    const frameCount = recovered.length / frames[0]!.length;
    expect(Number.isInteger(frameCount)).toBe(true);
    const durationMs = Math.floor((frameCount * 1024 * 1000) / 22050);
    const expectedMs = Math.floor((3 * 1024 * 1000) / 22050);
    expect(durationMs).toBe(expectedMs);
  });
});

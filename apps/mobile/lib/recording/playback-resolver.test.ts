import { describe, expect, it } from "vitest";
import { volumeAt } from "@/lib/recording/playback";
import type { RecordingVolume } from "@/data/recording/recordingTypes";

describe("recordingPlaybackResolver volume continuation (H5)", () => {
  const volumes: RecordingVolume[] = [
    {
      file: "export-001.m4a",
      uri: "file:///tmp/export-001.m4a",
      fromIndex: 0,
      toIndex: 19,
      durationMs: 600_000,
    },
    {
      file: "export-002.m4a",
      uri: "file:///tmp/export-002.m4a",
      fromIndex: 20,
      toIndex: 25,
      durationMs: 180_000,
    },
  ];

  it("maps a seek into the second volume", () => {
    const hit = volumeAt({ volumes, durationMs: 780_000 }, 650_000);
    expect(hit?.volume.file).toBe("export-002.m4a");
    expect(hit?.offsetMs).toBe(50_000);
  });
});

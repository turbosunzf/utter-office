import { describe, expect, it, vi } from "vitest";

vi.mock("@/data/api", () => ({ api: {} }));

import { recordingApi } from "./recordingApi";

describe("recordingApi stub resume", () => {
  it("reports already-uploaded chunks so pending hashes can resume", async () => {
    const created = await recordingApi.createRecording({ title: "meeting" });
    await recordingApi.uploadChunk({
      recordingId: created.id,
      chunkIndex: 0,
      dataBase64: "YQ==",
      hash: "aaa",
    });
    await recordingApi.uploadChunk({
      recordingId: created.id,
      chunkIndex: 2,
      dataBase64: "Yg==",
      hash: "ccc",
    });
    const status = await recordingApi.getUploadStatus(created.id);
    expect(status.uploadedChunks.sort((a, b) => a - b)).toEqual([0, 2]);
  });
});

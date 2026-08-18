import { File } from "expo-file-system";
import { ensureDir, fileIn, readJson, recRoot, writeJson } from "./recordingFs";
import type { TranscriptBundle } from "@/data/recording/recordingTypes";
import {
  MOCK_ANALYSIS,
  MOCK_SUMMARY,
  MOCK_TRANSCRIPT_SENTENCES,
  USE_MOCK_RECORDING_CONTENT,
} from "@/data/mocks/recordings";

function storeFile(): File {
  return fileIn(ensureDir(recRoot()), "transcripts.json");
}

type StoreShape = { byId: Record<string, TranscriptBundle> };

export const TranscriptStore = {
  async get(recordingId: string): Promise<TranscriptBundle | null> {
    const store = await readJson<StoreShape>(storeFile(), { byId: {} });
    return store.byId[recordingId] ?? null;
  },

  async set(bundle: TranscriptBundle): Promise<void> {
    const store = await readJson<StoreShape>(storeFile(), { byId: {} });
    store.byId[bundle.recordingId] = bundle;
    await writeJson(storeFile(), store);
  },

  async seedMock(recordingId: string): Promise<TranscriptBundle> {
    const bundle: TranscriptBundle = {
      recordingId,
      sentences: MOCK_TRANSCRIPT_SENTENCES,
      summary: MOCK_SUMMARY,
      analysis: MOCK_ANALYSIS,
      isSample: USE_MOCK_RECORDING_CONTENT,
    };
    await this.set(bundle);
    return bundle;
  },
};

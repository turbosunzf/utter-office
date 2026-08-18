import { File } from "expo-file-system";
import { ensureDir, fileIn, readJson, recRoot, writeJson } from "./recordingFs";
import type { LocalRecording } from "@/data/recording/recordingTypes";
import { recordingApi } from "@/data/recording/recordingApi";

function registryFile(): File {
  return fileIn(ensureDir(recRoot()), "recordings.json");
}

type Registry = { items: LocalRecording[] };

export const localRecordingRegistry = {
  async list(): Promise<LocalRecording[]> {
    const store = await readJson<Registry>(registryFile(), { items: [] });
    return store.items.sort((a, b) => b.createdAt - a.createdAt);
  },

  async get(id: string): Promise<LocalRecording | null> {
    const items = await this.list();
    return items.find((r) => r.id === id) ?? null;
  },

  async upsert(recording: LocalRecording): Promise<void> {
    const items = await this.list();
    const next = items.filter((r) => r.id !== recording.id);
    next.push(recording);
    await writeJson(registryFile(), { items: next });
    await recordingApi.registerLocal(recording);
  },
};

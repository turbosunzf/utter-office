import { File } from "expo-file-system";
import { recRoot, ensureDir, fileIn, readJson, writeJson } from "./recordingFs";
import { chunkUploader } from "./ChunkUploader";

export type UploadJob = {
  recordingId: string;
  fileUri: string;
  status: "pending" | "uploading" | "done" | "failed";
  error?: string;
};

type QueueState = { jobs: UploadJob[] };

function queueFile(): File {
  return fileIn(ensureDir(recRoot()), "upload-queue.json");
}

export const UploadQueueStore = {
  async load(): Promise<UploadJob[]> {
    const state = await readJson<QueueState>(queueFile(), { jobs: [] });
    return state.jobs;
  },

  async save(jobs: UploadJob[]): Promise<void> {
    await writeJson(queueFile(), { jobs });
  },

  async enqueue(job: UploadJob): Promise<void> {
    const jobs = await this.load();
    const next = jobs.filter((j) => j.recordingId !== job.recordingId);
    next.push({ ...job, status: "pending" });
    await this.save(next);
  },

  async update(recordingId: string, patch: Partial<UploadJob>): Promise<void> {
    const jobs = await this.load();
    await this.save(
      jobs.map((j) => (j.recordingId === recordingId ? { ...j, ...patch } : j)),
    );
  },
};

export const UploadPipeline = {
  async drain(): Promise<void> {
    const jobs = await UploadQueueStore.load();
    for (const job of jobs) {
      if (job.status === "done") continue;
      await UploadQueueStore.update(job.recordingId, { status: "uploading" });
      try {
        await chunkUploader.upload(job.fileUri, job.recordingId);
        await UploadQueueStore.update(job.recordingId, {
          status: "done",
          error: undefined,
        });
      } catch (error) {
        await UploadQueueStore.update(job.recordingId, {
          status: "failed",
          error: error instanceof Error ? error.message : String(error),
        });
      }
    }
  },
};

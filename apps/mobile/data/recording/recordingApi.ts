import { api } from "@/data/api";
import type {
  CreateRecordingRequest,
  CreateRecordingResponse,
  LocalRecording,
  UploadStatusResponse,
} from "./recordingTypes";

const USE_LIVE_RECORDING_API = false;

const stubRecordings = new Map<string, LocalRecording>();
const stubUploads = new Map<string, Set<number>>();

function localId(): string {
  return `rec_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
}

export const recordingApi = {
  async createRecording(
    body: CreateRecordingRequest,
  ): Promise<CreateRecordingResponse> {
    if (USE_LIVE_RECORDING_API) {
      return api.createAppRecording(body);
    }
    const id = localId();
    stubUploads.set(id, new Set());
    return { id };
  },

  async registerLocal(recording: LocalRecording): Promise<void> {
    stubRecordings.set(recording.id, recording);
  },

  async listLocal(): Promise<LocalRecording[]> {
    return [...stubRecordings.values()].sort((a, b) => b.createdAt - a.createdAt);
  },

  async getLocal(id: string): Promise<LocalRecording | null> {
    return stubRecordings.get(id) ?? null;
  },

  async getUploadStatus(recordingId: string): Promise<UploadStatusResponse> {
    if (USE_LIVE_RECORDING_API) {
      return api.getRecordingUploadStatus(recordingId);
    }
    return { uploadedChunks: [...(stubUploads.get(recordingId) ?? [])] };
  },

  async uploadChunk(params: {
    recordingId: string;
    chunkIndex: number;
    dataBase64: string;
    hash: string;
  }): Promise<void> {
    if (USE_LIVE_RECORDING_API) {
      await api.uploadRecordingChunk({
        recordingId: params.recordingId,
        chunkIndex: params.chunkIndex,
        data: params.dataBase64,
        hash: params.hash,
      });
      return;
    }
    const set = stubUploads.get(params.recordingId) ?? new Set<number>();
    set.add(params.chunkIndex);
    stubUploads.set(params.recordingId, set);
  },

  async completeUpload(params: {
    recordingId: string;
    totalChunks: number;
    fileSize: number;
    hash: string;
  }): Promise<void> {
    if (USE_LIVE_RECORDING_API) {
      await api.completeRecordingUpload(params);
    }
  },
};

import * as Crypto from "expo-crypto";
import * as FileSystem from "expo-file-system/legacy";
import {
  UPLOAD_CHUNK_SIZE,
  UPLOAD_CONCURRENCY,
  UPLOAD_RETRY_BACKOFF,
} from "@/native/recording/encryptedRecordingSpec";
import { recordingApi } from "@/data/recording/recordingApi";

function bytesToHex(buf: Uint8Array): string {
  return Array.from(buf, (b) => b.toString(16).padStart(2, "0")).join("");
}

async function sha256Base64(dataBase64: string): Promise<string> {
  const raw = Uint8Array.from(atob(dataBase64), (c) => c.charCodeAt(0));
  const digest = await Crypto.digest(Crypto.CryptoDigestAlgorithm.SHA256, raw);
  return bytesToHex(new Uint8Array(digest));
}

function sleep(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}

async function readChunkBase64(
  uri: string,
  start: number,
  length: number,
): Promise<string> {
  return FileSystem.readAsStringAsync(uri, {
    encoding: FileSystem.EncodingType.Base64,
    position: start,
    length,
  });
}

async function pMap<T>(
  items: T[],
  mapper: (item: T) => Promise<void>,
  concurrency: number,
): Promise<void> {
  const queue = [...items];
  const workers = Array.from({ length: Math.min(concurrency, queue.length) }, async () => {
    while (queue.length) {
      const next = queue.shift();
      if (next === undefined) return;
      await mapper(next);
    }
  });
  await Promise.all(workers);
}

export class ChunkUploader {
  async upload(fileUri: string, recordingId: string): Promise<void> {
    const info = await FileSystem.getInfoAsync(fileUri);
    if (!info.exists || info.size == null) {
      throw new Error("upload file missing");
    }
    const fileSize = info.size;
    const totalChunks = Math.max(1, Math.ceil(fileSize / UPLOAD_CHUNK_SIZE));
    const { uploadedChunks } = await recordingApi.getUploadStatus(recordingId);
    const uploaded = new Set(uploadedChunks);
    const pending = Array.from({ length: totalChunks }, (_, i) => i).filter(
      (i) => !uploaded.has(i),
    );

    await pMap(
      pending,
      async (chunkIndex) => {
        const start = chunkIndex * UPLOAD_CHUNK_SIZE;
        const length = Math.min(UPLOAD_CHUNK_SIZE, fileSize - start);
        const data = await readChunkBase64(fileUri, start, length);
        const hash = await sha256Base64(data);
        await this.uploadChunkWithRetry(recordingId, chunkIndex, data, hash);
      },
      UPLOAD_CONCURRENCY,
    );

    const whole = await FileSystem.readAsStringAsync(fileUri, {
      encoding: FileSystem.EncodingType.Base64,
    });
    const finalHash = await sha256Base64(whole);
    await recordingApi.completeUpload({
      recordingId,
      totalChunks,
      fileSize,
      hash: finalHash,
    });
  }

  private async uploadChunkWithRetry(
    recordingId: string,
    chunkIndex: number,
    dataBase64: string,
    hash: string,
  ): Promise<void> {
    let lastError: unknown;
    for (let attempt = 0; attempt <= UPLOAD_RETRY_BACKOFF.length; attempt++) {
      try {
        await recordingApi.uploadChunk({
          recordingId,
          chunkIndex,
          dataBase64,
          hash,
        });
        return;
      } catch (error) {
        lastError = error;
        if (attempt === UPLOAD_RETRY_BACKOFF.length) break;
        await sleep(UPLOAD_RETRY_BACKOFF[attempt] ?? 4000);
      }
    }
    throw lastError;
  }
}

export const chunkUploader = new ChunkUploader();

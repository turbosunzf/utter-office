import { ASR_FRAME_BYTES } from "@/native/recording/encryptedRecordingSpec";
import { asrApi } from "@/data/recording/asrApi";
import {
  MOCK_TRANSCRIPT_SENTENCES,
  USE_MOCK_RECORDING_CONTENT,
} from "@/data/mocks/recordings";
import { logAsr } from "./realtimeAsrLogger";
import { parseAsrMessage } from "./RealtimeAsrParser";
import type { AsrFinal, AsrPartial } from "./types";

function splitIntoChunks(base64: string, size: number): string[] {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  const chunks: string[] = [];
  for (let i = 0; i < bytes.length; i += size) {
    const slice = bytes.subarray(i, i + size);
    let s = "";
    for (let j = 0; j < slice.length; j++) s += String.fromCharCode(slice[j]!);
    chunks.push(btoa(s));
    logAsr("pcm-frame", { bytes: slice.length });
  }
  return chunks;
}

type Handlers = {
  onPartial?: (p: AsrPartial) => void;
  onFinal?: (f: AsrFinal) => void;
};

export class RealtimeAsrService {
  private ws: WebSocket | null = null;
  private mockTimer: ReturnType<typeof setInterval> | null = null;
  private mockIndex = 0;
  private handlers: Handlers = {};
  private stopped = true;

  async start(recordingId: string, handlers: Handlers): Promise<void> {
    this.handlers = handlers;
    this.stopped = false;
    const handshake = await asrApi.handshake(recordingId);
    if (handshake.wsUrl.startsWith("stub:")) {
      this.startStubPlayback();
      return;
    }
    await this.connect(handshake.wsUrl);
  }

  handlePcmFrame(base64: string): void {
    if (this.stopped) return;
    const chunks = splitIntoChunks(base64, ASR_FRAME_BYTES);
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) return;
    for (const chunk of chunks) this.ws.send(chunk);
  }

  async stopBestEffort(timeoutMs: number): Promise<void> {
    this.stopped = true;
    if (this.mockTimer) {
      clearInterval(this.mockTimer);
      this.mockTimer = null;
    }
    const ws = this.ws;
    this.ws = null;
    if (!ws) return;
    await Promise.race([
      new Promise<void>((resolve) => {
        ws.onclose = () => resolve();
        ws.close();
      }),
      new Promise<void>((resolve) => setTimeout(resolve, timeoutMs)),
    ]);
  }

  private startStubPlayback(): void {
    if (!USE_MOCK_RECORDING_CONTENT) return;
    this.mockTimer = setInterval(() => {
      const line =
        MOCK_TRANSCRIPT_SENTENCES[
          this.mockIndex % MOCK_TRANSCRIPT_SENTENCES.length
        ]!;
      this.mockIndex += 1;
      this.handlers.onPartial?.({
        text: line.text,
        translation: line.translation,
        speaker: line.speaker,
      });
      this.handlers.onFinal?.({
        text: line.text,
        translation: line.translation,
        speaker: line.speaker,
        startMs: line.startMs,
        endMs: line.endMs,
      });
    }, 3000);
  }

  private connect(url: string): Promise<void> {
    return new Promise((resolve, reject) => {
      const ws = new WebSocket(url);
      this.ws = ws;
      const timer = setTimeout(() => reject(new Error("asr handshake timeout")), 4000);
      ws.onopen = () => {
        logAsr("ws-open");
      };
      ws.onmessage = (ev) => {
        const msg = parseAsrMessage(String(ev.data));
        if (!msg) return;
        if (msg.type === "handshake_ok") {
          clearTimeout(timer);
          resolve();
        } else if (msg.type === "partial") {
          this.handlers.onPartial?.(msg.payload);
        } else if (msg.type === "final") {
          this.handlers.onFinal?.(msg.payload);
        }
      };
      ws.onerror = () => {
        clearTimeout(timer);
        reject(new Error("asr ws error"));
      };
    });
  }
}

export const realtimeAsrService = new RealtimeAsrService();

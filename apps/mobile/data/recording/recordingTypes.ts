export type RecordingStatus =
  | "idle"
  | "recording"
  | "paused"
  | "interrupted"
  | "stopping"
  | "stopped"
  | "failed";

export type LocalRecording = {
  id: string;
  sessionId: string;
  sessionDir: string;
  title: string;
  durationMs: number;
  createdAt: number;
  volumes: RecordingVolume[];
  transcriptReady: boolean;
  isSampleContent: boolean;
};

export type RecordingVolume = {
  file: string;
  uri: string;
  fromIndex: number;
  toIndex: number;
  durationMs: number;
};

export type CreateRecordingRequest = {
  title?: string;
  workspaceId?: string | null;
};

export type CreateRecordingResponse = {
  id: string;
  uploadUrl?: string;
};

export type UploadStatusResponse = {
  uploadedChunks: number[];
  totalChunks?: number;
};

export type AsrHandshakeResponse = {
  wsUrl: string;
  token: string;
  sessionId: string;
};

export type TranscriptSentence = {
  id: string;
  speaker: string;
  startMs: number;
  endMs: number;
  text: string;
  translation?: string;
};

export type MeetingSummary = {
  title: string;
  bullets: string[];
  decisions: string[];
  todos: string[];
};

export type MeetingAnalysis = {
  topics: string[];
  sentiment: string;
  risks: string[];
  nextSteps: string[];
};

export type TranscriptBundle = {
  recordingId: string;
  sentences: TranscriptSentence[];
  summary: MeetingSummary;
  analysis: MeetingAnalysis;
  isSample: boolean;
};

export type ActiveSessionPointer = {
  sessionId: string;
  sessionDir: string;
  recordingId: string;
  startedAt: number;
  lastIndex: number;
  totalDurationMs: number;
  accumulatedPauseMs: number;
  title: string;
};

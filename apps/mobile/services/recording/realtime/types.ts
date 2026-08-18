export type AsrPartial = {
  text: string;
  translation?: string;
  speaker?: string;
};

export type AsrFinal = AsrPartial & {
  startMs: number;
  endMs: number;
};

export type RealtimeAsrMessage =
  | { type: "handshake_ok" }
  | { type: "partial"; payload: AsrPartial }
  | { type: "final"; payload: AsrFinal }
  | { type: "error"; message: string };

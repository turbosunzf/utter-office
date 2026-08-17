/** Mock bilateral lines for voice-translate (B 类 · USE_MOCK_VOICE). */
export type VoiceTranslateSide = "me" | "other";

export type VoiceTranslateLine = {
  side: VoiceTranslateSide;
  time: string;
  text: string;
  translation: string;
};

export const VOICE_TRANSLATE_SEED: VoiceTranslateLine[] = [
  {
    side: "me",
    time: "00:00",
    text: "您好，今天想先确认一下交付时间。",
    translation: "Hello, I would like to confirm the delivery timeline today.",
  },
  {
    side: "other",
    time: "00:04",
    text: "Sure, we can ship by Friday if the specs are final.",
    translation: "没问题，如果规格已定，我们可以周五发货。",
  },
  {
    side: "me",
    time: "00:09",
    text: "规格已经定稿了，麻烦同步给仓库。",
    translation: "The specs are finalized. Please sync with the warehouse.",
  },
];

export const VOICE_TRANSLATE_HOLD_ME = {
  text: "（中）这是一段按住说话的示例原文。",
  translation: "This is a sample hold-to-speak source sentence.",
} as const;

export const VOICE_TRANSLATE_HOLD_OTHER = {
  text: "This is a sample utterance from the other side.",
  translation: "（中）这是对方按住说话后的示例译文。",
} as const;

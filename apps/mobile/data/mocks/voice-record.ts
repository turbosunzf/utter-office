/** Mock transcript for voice-record (B 类 · USE_MOCK_VOICE). */
export type VoiceTranscriptLine = {
  speaker: string;
  time: string;
  text: string;
  translation: string;
};

export const VOICE_RECORD_SEED: VoiceTranscriptLine[] = [
  {
    speaker: "说话人1",
    time: "00:00",
    text: "这个需求我们先从语音入口开始，把录音和翻译两个页面做起来。",
    translation:
      "Let's start from the voice entry and build the recording and translation pages.",
  },
  {
    speaker: "说话人2",
    time: "00:03",
    text: "可以，录音页要有个实时转写列表和底部控制区。",
    translation:
      "Sure, the recording page needs a live transcript list and a bottom control dock.",
  },
];

export const VOICE_RECORD_POOL: Omit<VoiceTranscriptLine, "time">[] = [
  {
    speaker: "说话人1",
    text: "对，底部 Dock 放波形、计时和暂停停止按钮。",
    translation: "Right, the dock holds the waveform, timer, and pause/stop buttons.",
  },
  {
    speaker: "说话人2",
    text: "翻译页做成左右对向气泡，按住说话松开出译。",
    translation:
      "Make the translate page bilateral bubbles with hold-to-speak / release-to-translate.",
  },
  {
    speaker: "说话人1",
    text: "深色模式也要正常，所有颜色走主题 token。",
    translation: "Dark mode must work too — all colours go through theme tokens.",
  },
  {
    speaker: "说话人2",
    text: "那这个版本先做纯 UI，真实转写后面再接。",
    translation: "Then this iteration is pure UI; real transcription comes later.",
  },
];

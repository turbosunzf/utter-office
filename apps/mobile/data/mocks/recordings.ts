import type {
  MeetingAnalysis,
  MeetingSummary,
  TranscriptSentence,
} from "@/data/recording/recordingTypes";

/** Flip false when real ASR / summary / analysis land. */
export const USE_MOCK_RECORDING_CONTENT = true;

export const MOCK_TRANSCRIPT_SENTENCES: TranscriptSentence[] = [
  {
    id: "s1",
    speaker: "说话人1",
    startMs: 0,
    endMs: 4200,
    text: "这个需求我们先从语音入口开始，把录音和翻译两个页面做起来。",
    translation:
      "Let's start from the voice entry and build the recording and translation pages.",
  },
  {
    id: "s2",
    speaker: "说话人2",
    startMs: 4300,
    endMs: 9100,
    text: "可以，录音页要有个实时转写列表和底部控制区。",
    translation:
      "Sure, the recording page needs a live transcript list and a bottom control dock.",
  },
  {
    id: "s3",
    speaker: "说话人1",
    startMs: 9200,
    endMs: 14100,
    text: "停止后要能进详情，原文精转、关键纪要和智能分析三个 Tab。",
    translation:
      "After stop we should land on a detail page with transcript, summary, and analysis tabs.",
  },
];

export const MOCK_SUMMARY: MeetingSummary = {
  title: "语音入口与录音详情",
  bullets: [
    "先落地本地加密录音内核，转写内容本期走示例。",
    "详情页三个 Tab：原文精转、关键纪要、智能分析。",
    "中央按钮长按仍是 Overlay，不采集、不发会话。",
  ],
  decisions: ["采集/加密/导出必须真实；ASR 与纪要走 Stub。"],
  todos: ["真机 force-stop 验收崩溃恢复", "后端就绪后替换 recordingApi"],
};

export const MOCK_ANALYSIS: MeetingAnalysis = {
  topics: ["本地录音内核", "详情三 Tab", "上传队列 Stub"],
  sentiment: "推进明确，依赖后端未就绪。",
  risks: ["超长录音导出超时（已用分卷缓解）", "国产 ROM 杀后台未引导"],
  nextSteps: ["接真实 ASR WebSocket", "上线前评估省电白名单"],
};

import { VoicePrototypePlaceholder } from "@/components/voice/voice-prototype-placeholder";

/**
 * 录音 prototype page — reached from the Voice tab popover. Non-functional
 * placeholder; real capture + ASR land in a follow-up issue.
 */
export default function VoiceRecordPage() {
  return (
    <VoicePrototypePlaceholder
      title="录音"
      icon="mic.fill"
      description="按住说话，将语音转写为文字并派发为需求或任务。真实录音与转写能力将在后续版本接入。"
    />
  );
}

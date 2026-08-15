import { VoicePrototypePlaceholder } from "@/components/voice/voice-prototype-placeholder";

/**
 * 翻译 prototype page — reached from the Voice tab popover. Non-functional
 * placeholder; real translation land in a follow-up issue.
 */
export default function VoiceTranslatePage() {
  return (
    <VoicePrototypePlaceholder
      title="翻译"
      icon="character.bubble.fill"
      description="将语音内容翻译为目标语言。真实翻译能力将在后续版本接入。"
    />
  );
}

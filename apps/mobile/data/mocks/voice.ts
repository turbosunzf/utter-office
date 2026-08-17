/**
 * Shared flag for voice subpage mock copy +「原型」banner (PRD §9).
 * Flip to false when real ASR lands.
 */
export const USE_MOCK_VOICE = true;

export const VOICE_PROTOTYPE_BANNER =
  "原型演示 · 尚未接入真实录音与转写";

/** Shown after hold-to-talk release — no chat send in prototype. */
export const VOICE_PROTOTYPE_TOAST =
  "原型示例 · 当前不会发送到对话";

/** Placeholder text when real send path is re-enabled later. */
export const VOICE_SEND_PLACEHOLDER = "你好";

/**
 * Gate for the prototype "send placeholder text" path.
 * Keep false — hold-to-talk only demos UI + toast.
 */
export const VOICE_SEND_ENABLED = false;

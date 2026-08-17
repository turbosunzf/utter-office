/**
 * In-memory zustand store for the central Voice tab's transient UI state.
 *
 * The record button (rendered as the Voice tab's `tabBarButton`, inside
 * <Tabs>) and its full-screen overlays (bottom sheet + recording ripple,
 * rendered as siblings in (tabs)/_layout.tsx) sit in different parts of the
 * tree, so they coordinate through this store rather than props.
 *
 * No persist middleware — same in-memory pattern as my-issues-view-store /
 * chat-drafts-store. This is pure session UI state.
 */
import { create } from "zustand";

interface VoiceState {
  sheetOpen: boolean;
  recording: boolean;
  /** Whether the finger has slid up into the "cancel send" zone (WeChat-style
   *  recording). Written by the record button's Pan gesture, read by the
   *  recording overlay so it can flip to the red cancel state live. */
  slidUp: boolean;
  openSheet: () => void;
  closeSheet: () => void;
  setRecording: (recording: boolean) => void;
  setSlidUp: (slidUp: boolean) => void;
}

export const useVoiceStore = create<VoiceState>((set) => ({
  sheetOpen: false,
  recording: false,
  slidUp: false,
  openSheet: () => set({ sheetOpen: true, slidUp: false }),
  closeSheet: () => set({ sheetOpen: false }),
  // Stopping recording resets slidUp so a stale value can't paint the
  // overlay red after the finger has left the cancel zone.
  setRecording: (recording) =>
    set((s) => ({ recording, slidUp: recording ? s.slidUp : false })),
  setSlidUp: (slidUp) => set({ slidUp }),
}));

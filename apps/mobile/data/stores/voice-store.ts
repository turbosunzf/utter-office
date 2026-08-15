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
  openSheet: () => void;
  closeSheet: () => void;
  setRecording: (recording: boolean) => void;
}

export const useVoiceStore = create<VoiceState>((set) => ({
  sheetOpen: false,
  recording: false,
  openSheet: () => set({ sheetOpen: true }),
  closeSheet: () => set({ sheetOpen: false }),
  setRecording: (recording) => set({ recording }),
}));

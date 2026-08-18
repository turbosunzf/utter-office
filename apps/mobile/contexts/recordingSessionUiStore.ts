import { create } from "zustand";
import { idlePeaks } from "@/services/recording/waveformPeaksService";
import type { InterruptedRecoveryState } from "@/services/recording/recordingInterruptedRecoveryStore";

type UiState = {
  bannerVisible: boolean;
  recovery: InterruptedRecoveryState | null;
  peaks: number[];
  hardwareLabel: string;
  setBannerVisible: (v: boolean) => void;
  setRecovery: (v: InterruptedRecoveryState | null) => void;
  setPeaks: (peaks: number[]) => void;
  setHardwareLabel: (label: string) => void;
  reset: () => void;
};

export const useRecordingSessionUiStore = create<UiState>((set) => ({
  bannerVisible: false,
  recovery: null,
  peaks: idlePeaks(),
  hardwareLabel: "",
  setBannerVisible: (bannerVisible) => set({ bannerVisible }),
  setRecovery: (recovery) => set({ recovery }),
  setPeaks: (peaks) => set({ peaks }),
  setHardwareLabel: (hardwareLabel) => set({ hardwareLabel }),
  reset: () =>
    set({
      bannerVisible: false,
      recovery: null,
      peaks: idlePeaks(),
      hardwareLabel: "",
    }),
}));

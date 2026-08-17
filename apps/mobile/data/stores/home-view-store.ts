/**
 * Home view preferences — report period memory (PRD §4.4).
 * In-memory; cleared on workspace switch.
 */
import { useEffect, useRef } from "react";
import { create } from "zustand";

export type ReportPeriod = "day" | "week" | "month";

interface HomeViewState {
  reportPeriod: ReportPeriod;
  setReportPeriod: (p: ReportPeriod) => void;
  reset: () => void;
}

export const useHomeViewStore = create<HomeViewState>((set) => ({
  reportPeriod: "day",
  setReportPeriod: (reportPeriod) => set({ reportPeriod }),
  reset: () => set({ reportPeriod: "day" }),
}));

export function useHomeViewResetOnWorkspaceChange(wsId: string | null) {
  const prev = useRef(wsId);
  useEffect(() => {
    if (prev.current !== wsId) {
      useHomeViewStore.getState().reset();
      prev.current = wsId;
    }
  }, [wsId]);
}

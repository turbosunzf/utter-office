/**
 * Board view store — mode (columns / swimlanes / progress) + filters.
 * Cleared on workspace change via useClearFiltersOnWorkspaceChange.
 */
import { create } from "zustand";
import type { IssuePriority, IssueStatus } from "@multica/core/types";

export type BoardViewMode = "columns" | "swimlanes" | "progress";

interface BoardViewState {
  mode: BoardViewMode;
  /** null = 全部项目 */
  projectId: string | null;
  statusFilters: IssueStatus[];
  priorityFilters: IssuePriority[];
  /** assignee key `${type}:${id}` or null for all */
  assigneeKey: string | null;
  setMode: (mode: BoardViewMode) => void;
  setProjectId: (id: string | null) => void;
  setAssigneeKey: (key: string | null) => void;
  toggleStatusFilter: (status: IssueStatus) => void;
  togglePriorityFilter: (priority: IssuePriority) => void;
  clearFilters: () => void;
  reset: () => void;
}

const INITIAL = {
  mode: "progress" as BoardViewMode,
  projectId: null as string | null,
  statusFilters: [] as IssueStatus[],
  priorityFilters: [] as IssuePriority[],
  assigneeKey: null as string | null,
};

export const useBoardViewStore = create<BoardViewState>((set) => ({
  ...INITIAL,
  setMode: (mode) => set({ mode }),
  setProjectId: (projectId) => set({ projectId }),
  setAssigneeKey: (assigneeKey) => set({ assigneeKey }),
  toggleStatusFilter: (status) =>
    set((s) => ({
      statusFilters: s.statusFilters.includes(status)
        ? s.statusFilters.filter((x) => x !== status)
        : [...s.statusFilters, status],
    })),
  togglePriorityFilter: (priority) =>
    set((s) => ({
      priorityFilters: s.priorityFilters.includes(priority)
        ? s.priorityFilters.filter((x) => x !== priority)
        : [...s.priorityFilters, priority],
    })),
  // 项目由顶栏 chip 单独管理，重置筛选不碰 projectId。
  clearFilters: () =>
    set({
      statusFilters: [],
      priorityFilters: [],
      assigneeKey: null,
    }),
  reset: () => set({ ...INITIAL }),
}));

/** 状态 / 优先级 / 负责人；不含项目（项目有独立 chip）。 */
export function boardHasActiveFilters(s: BoardViewState): boolean {
  return (
    s.statusFilters.length > 0 ||
    s.priorityFilters.length > 0 ||
    s.assigneeKey != null
  );
}

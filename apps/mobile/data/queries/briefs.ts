/**
 * Briefs query — mock-backed until B-2 (PRD §4.6 / §10.6).
 */
import { queryOptions } from "@tanstack/react-query";
import { getMockBrief, listMockBriefs } from "@/data/mocks/briefs";

/** Flip false when `/api/briefs` is mirrored; drives「示例数据」badge. */
export const USE_MOCK_BRIEFS = true;

export const briefKeys = {
  all: (wsId: string | null) => ["briefs", wsId] as const,
  list: (wsId: string | null) => ["briefs", wsId, "list"] as const,
  detail: (wsId: string | null, id: string) =>
    ["briefs", wsId, "detail", id] as const,
};

export function briefListOptions(wsId: string | null) {
  return queryOptions({
    queryKey: briefKeys.list(wsId),
    queryFn: async ({ signal: _signal }) => {
      if (USE_MOCK_BRIEFS) return listMockBriefs();
      throw new Error("briefs API not wired");
    },
    enabled: !!wsId,
  });
}

export function briefDetailOptions(wsId: string | null, id: string) {
  return queryOptions({
    queryKey: briefKeys.detail(wsId, id),
    queryFn: async ({ signal: _signal }) => {
      if (USE_MOCK_BRIEFS) {
        const b = getMockBrief(id);
        if (!b) throw new Error("简报不存在");
        return b;
      }
      throw new Error("briefs API not wired");
    },
    enabled: !!wsId && !!id,
  });
}

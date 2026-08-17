/**
 * Work outcomes query — mock-backed until B-5 / Run 产物回流（PRD §4.4 / §10.6）.
 */
import { queryOptions } from "@tanstack/react-query";
import {
  getMockOutcome,
  listMockOutcomes,
} from "@/data/mocks/outcomes";

/** Flip false when real outcomes API is mirrored; drives「示例」badge. */
export const USE_MOCK_OUTCOMES = true;

export const outcomeKeys = {
  all: (wsId: string | null) => ["outcomes", wsId] as const,
  list: (wsId: string | null) => ["outcomes", wsId, "list"] as const,
  detail: (wsId: string | null, id: string) =>
    ["outcomes", wsId, "detail", id] as const,
};

export function outcomeListOptions(wsId: string | null) {
  return queryOptions({
    queryKey: outcomeKeys.list(wsId),
    queryFn: async ({ signal: _signal }) => {
      if (USE_MOCK_OUTCOMES) return listMockOutcomes();
      throw new Error("outcomes API not wired");
    },
    enabled: !!wsId,
  });
}

export function outcomeDetailOptions(wsId: string | null, id: string) {
  return queryOptions({
    queryKey: outcomeKeys.detail(wsId, id),
    queryFn: async ({ signal: _signal }) => {
      if (USE_MOCK_OUTCOMES) {
        const o = getMockOutcome(id);
        if (!o) throw new Error("成果不存在");
        return o;
      }
      throw new Error("outcomes API not wired");
    },
    enabled: !!wsId && !!id,
  });
}

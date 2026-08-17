/**
 * Resolve default voice/chat agent (PRD §6.4):
 * stored default (if still available) → first usable agent.
 */
import type { Agent } from "@multica/core/types";
import { useAssistantStore } from "@/data/stores/assistant-store";

export function resolveDefaultAgent(
  agents: Agent[],
  wsId: string | null,
  userId: string | null | undefined,
  canUse: (a: Agent) => boolean,
): Agent | null {
  const visible = agents.filter((a) => !a.archived_at && canUse(a));
  if (visible.length === 0) return null;
  if (!wsId) return visible[0] ?? null;

  const stored = useAssistantStore.getState().defaultAgentByWs[wsId];
  if (stored) {
    const hit = visible.find((a) => a.id === stored);
    if (hit) return hit;
  }
  void userId; // reserved for future owner-preference
  return visible[0] ?? null;
}

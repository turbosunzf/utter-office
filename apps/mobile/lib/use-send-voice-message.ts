/**
 * Reusable "send a voice message to the current chat" hook.
 *
 * Resolves agent via §6.4 fallback: default agent → first available.
 * Creates a session for that agent if needed.
 */
import { useCallback, useState } from "react";
import { Alert } from "react-native";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "@/data/api";
import { useAuthStore } from "@/data/auth-store";
import { useWorkspaceStore } from "@/data/workspace-store";
import { agentListOptions } from "@/data/queries/agents";
import { memberListOptions } from "@/data/queries/members";
import { chatKeys, chatSessionsOptions } from "@/data/queries/chat";
import { useAssistantHydration } from "@/data/stores/assistant-store";
import { canAssignAgent } from "@/lib/can-assign-agent";
import { resolveDefaultAgent } from "@/lib/resolve-default-agent";

export function useSendVoiceMessage() {
  const qc = useQueryClient();
  const wsId = useWorkspaceStore((s) => s.currentWorkspaceId);
  const userId = useAuthStore((s) => s.user?.id);
  useAssistantHydration(wsId);

  const { data: agents = [] } = useQuery(agentListOptions(wsId));
  const { data: members = [] } = useQuery(memberListOptions(wsId));
  const { data: sessions = [] } = useQuery(chatSessionsOptions(wsId));
  const [sending, setSending] = useState(false);

  const role = members.find((m) => m.user_id === userId)?.role;

  const send = useCallback(
    async (text: string): Promise<boolean> => {
      const agent = resolveDefaultAgent(agents, wsId, userId, (a) =>
        canAssignAgent(a, userId, role),
      );
      if (!agent) {
        Alert.alert("暂无可用数字员工", "该工作区暂无可用数字员工，无法发送消息。");
        return false;
      }

      setSending(true);
      try {
        const existing =
          sessions.find(
            (s) => s.agent_id === agent.id && s.status !== "archived",
          ) ??
          sessions.find((s) => s.status !== "archived") ??
          sessions[0];
        let sessionId = existing?.id ?? null;
        if (!sessionId || existing?.agent_id !== agent.id) {
          const session = await api.createChatSession({
            agent_id: agent.id,
            title: text.slice(0, 50),
          });
          sessionId = session.id;
        }
        await api.sendChatMessage(sessionId, text);
        qc.invalidateQueries({ queryKey: chatKeys.sessions(wsId) });
        qc.invalidateQueries({ queryKey: chatKeys.messages(sessionId) });
        return true;
      } catch (err) {
        Alert.alert(
          "发送失败",
          err instanceof Error ? err.message : "未知错误",
        );
        return false;
      } finally {
        setSending(false);
      }
    },
    [agents, sessions, wsId, qc, userId, role],
  );

  return { send, sending };
}

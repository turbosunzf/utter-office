/**
 * Reusable "send a voice message to the current chat" hook.
 *
 * Extracted from the voice-talk screen so the central record button can
 * reuse the same send channel (spec §4.2: releasing a ≥2s hold sends a
 * hard-coded "你好" to the current chat). Deliberately reuses the API
 * client + chat query keys instead of importing the chat tab's
 * component-local `handleSend` (coupled to that screen's session/agent
 * state).
 *
 * Resolves the first non-archived agent + first non-archived session
 * (creating one if none), POSTs the message, then invalidates the chat
 * caches so the Chat tab refetches and shows it.
 */
import { useCallback, useState } from "react";
import { Alert } from "react-native";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "@/data/api";
import { useWorkspaceStore } from "@/data/workspace-store";
import { agentListOptions } from "@/data/queries/agents";
import { chatKeys, chatSessionsOptions } from "@/data/queries/chat";

export function useSendVoiceMessage() {
  const qc = useQueryClient();
  const wsId = useWorkspaceStore((s) => s.currentWorkspaceId);

  const { data: agents = [] } = useQuery(agentListOptions(wsId));
  const { data: sessions = [] } = useQuery(chatSessionsOptions(wsId));
  const [sending, setSending] = useState(false);

  const availableAgents = agents.filter((a) => !a.archived_at);

  const send = useCallback(
    async (text: string): Promise<boolean> => {
      const agent = availableAgents[0];
      if (!agent) {
        Alert.alert("暂无可用数字员工", "该工作区暂无可用数字员工，无法发送消息。");
        return false;
      }

      setSending(true);
      try {
        const existing =
          sessions.find((s) => s.status !== "archived") ?? sessions[0];
        let sessionId = existing?.id ?? null;
        if (!sessionId) {
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
    [availableAgents, sessions, wsId, qc],
  );

  return { send, sending };
}

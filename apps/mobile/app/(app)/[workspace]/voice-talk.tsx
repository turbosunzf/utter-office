/**
 * voice-talk — "长按发语音" MVP (hold-to-talk simulation).
 *
 * Press and hold the mic to enter a "recording" state; release ends the
 * recording and sends a hard-coded "你好" to the current chat. Real voice
 * capture / ASR / audio message protocol are out of scope (follow-up
 * issues) — this screen proves the push-to-talk interaction + the chat
 * send channel end-to-end on device.
 *
 * Send path deliberately reuses the API client + chat query keys instead
 * of importing the chat tab's component-local `handleSend` (which is
 * coupled to that screen's session/agent state). We resolve the first
 * non-archived agent + first non-archived session (creating one if none),
 * POST the message, then invalidate the chat caches so the Chat tab
 * refetches and shows it.
 */
import { useCallback, useState } from "react";
import { ActivityIndicator, Alert, Pressable, View } from "react-native";
import { Image } from "expo-image";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Text } from "@/components/ui/text";
import { api } from "@/data/api";
import { useWorkspaceStore } from "@/data/workspace-store";
import { agentListOptions } from "@/data/queries/agents";
import { chatKeys, chatSessionsOptions } from "@/data/queries/chat";
import { useColorScheme } from "@/lib/use-color-scheme";
import { THEME } from "@/lib/theme";

// Static waveform bars — placeholder for the future live audio level meter.
const WAVE_BARS = [14, 24, 34, 20, 40, 26, 16];

export default function VoiceTalkPage() {
  const qc = useQueryClient();
  const wsId = useWorkspaceStore((s) => s.currentWorkspaceId);
  const { colorScheme } = useColorScheme();
  const t = THEME[colorScheme];

  const { data: agents = [] } = useQuery(agentListOptions(wsId));
  const { data: sessions = [] } = useQuery(chatSessionsOptions(wsId));

  const [recording, setRecording] = useState(false);
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);

  const availableAgents = agents.filter((a) => !a.archived_at);

  const sendHello = useCallback(async () => {
    const agent = availableAgents[0];
    if (!agent) {
      Alert.alert("无可用 agent", "该工作区暂无可用 agent，无法发送消息。");
      return;
    }

    setSending(true);
    setSent(false);
    try {
      const existing =
        sessions.find((s) => s.status !== "archived") ?? sessions[0];
      let sessionId = existing?.id ?? null;
      if (!sessionId) {
        const session = await api.createChatSession({
          agent_id: agent.id,
          title: "你好",
        });
        sessionId = session.id;
      }
      await api.sendChatMessage(sessionId, "你好");
      qc.invalidateQueries({ queryKey: chatKeys.sessions(wsId) });
      qc.invalidateQueries({ queryKey: chatKeys.messages(sessionId) });
      setSent(true);
    } catch (err) {
      Alert.alert(
        "发送失败",
        err instanceof Error ? err.message : "未知错误",
      );
    } finally {
      setSending(false);
    }
  }, [availableAgents, sessions, wsId, qc]);

  const micColor = recording ? "#FFFFFF" : t.foreground;

  return (
    <View className="flex-1 bg-background items-center justify-center px-8">
      <Text className="text-sm text-muted-foreground mb-8 text-center">
        {recording
          ? "正在录音，松开结束并发送"
          : sending
            ? "发送中…"
            : "按住说话，松开发送到当前聊天"}
      </Text>

      <Pressable
        onPressIn={() => {
          setRecording(true);
          setSent(false);
        }}
        onPressOut={() => {
          setRecording(false);
          void sendHello();
        }}
        disabled={sending}
        accessibilityLabel="长按说话"
        accessibilityHint="松开发送「你好」到当前聊天"
        style={{
          width: 160,
          height: 160,
          borderRadius: 80,
          alignItems: "center",
          justifyContent: "center",
          backgroundColor: recording ? t.brand : t.secondary,
          gap: 8,
        }}
      >
        <Image
          source="sf:mic.fill"
          tintColor={micColor}
          style={{ width: 40, height: 40 }}
        />
        {recording ? (
          <View className="flex-row items-end gap-1 h-10">
            {WAVE_BARS.map((h, i) => (
              <View
                key={i}
                className="w-1 rounded-full bg-white"
                style={{ height: h }}
              />
            ))}
          </View>
        ) : sending ? (
          <ActivityIndicator color={t.foreground} />
        ) : (
          <Text className="text-xs font-medium text-muted-foreground">
            长按说话
          </Text>
        )}
      </Pressable>

      {sent ? (
        <View className="mt-6 items-center gap-1">
          <Text className="text-sm font-medium text-foreground">
            已发送：你好
          </Text>
          <Text className="text-xs text-muted-foreground">
            切到「聊天」标签页即可查看
          </Text>
        </View>
      ) : null}
    </View>
  );
}

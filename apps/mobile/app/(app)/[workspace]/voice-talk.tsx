/**
 * voice-talk — 「发语音」页（原型：按住说话 + 选择接收员工）。
 * 按住无延迟；松开 toast，不发送到对话。
 */
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Animated,
  Easing,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  View,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { useQuery } from "@tanstack/react-query";
import type { Agent } from "@multica/core/types";
import { Icon } from "@/components/ui/icon";
import * as Haptics from "expo-haptics";
import { Text } from "@/components/ui/text";
import { ActorAvatar } from "@/components/ui/actor-avatar";
import { ElevatedSurface } from "@/components/ui/elevated-surface";
import { VoicePrototypeBanner } from "@/components/voice/voice-prototype-banner";
import {
  useAssistantHydration,
  useAssistantStore,
} from "@/data/stores/assistant-store";
import { useVoiceStore } from "@/data/stores/voice-store";
import { VOICE_PROTOTYPE_TOAST } from "@/data/mocks/voice";
import { agentListOptions } from "@/data/queries/agents";
import { memberListOptions } from "@/data/queries/members";
import { useAuthStore } from "@/data/auth-store";
import { useWorkspaceStore } from "@/data/workspace-store";
import { canAssignAgent } from "@/lib/can-assign-agent";
import { isAgentRuntimeBound } from "@/lib/is-agent-runtime-bound";
import { resolveDefaultAgent } from "@/lib/resolve-default-agent";
import { useColorScheme } from "@/lib/use-color-scheme";
import { THEME } from "@/lib/theme";
import { cn } from "@/lib/utils";

const EQ_BAR_COUNT = 4;

function agentStatusLabel(agent: Agent): { label: string; tone: string } {
  if (!isAgentRuntimeBound(agent)) {
    return { label: "未绑定", tone: "text-muted-foreground" };
  }
  switch (agent.status) {
    case "working":
      return { label: "工作中", tone: "text-brand" };
    case "idle":
      return { label: "在岗", tone: "text-success" };
    case "blocked":
      return { label: "受阻", tone: "text-warning" };
    case "error":
      return { label: "异常", tone: "text-destructive" };
    case "offline":
    default:
      return { label: "离线", tone: "text-muted-foreground" };
  }
}

export default function VoiceTalkPage() {
  const wsId = useWorkspaceStore((s) => s.currentWorkspaceId);
  const userId = useAuthStore((s) => s.user?.id);
  useAssistantHydration(wsId);
  const setDefaultAgent = useAssistantStore((s) => s.setDefaultAgent);
  const defaultByWs = useAssistantStore((s) => s.defaultAgentByWs);
  const showToast = useVoiceStore((s) => s.showToast);
  const { colorScheme } = useColorScheme();
  const t = THEME[colorScheme];
  const well = colorScheme === "dark" ? t.secondary : "#F5F7FC";

  const { data: agents = [] } = useQuery(agentListOptions(wsId));
  const { data: members = [] } = useQuery(memberListOptions(wsId));
  const role = members.find((m) => m.user_id === userId)?.role;

  const usable = useMemo(
    () =>
      agents
        .filter((a) => !a.archived_at && canAssignAgent(a, userId, role))
        .sort((a, b) => a.name.localeCompare(b.name, "zh")),
    [agents, userId, role],
  );

  const target = useMemo(() => {
    void defaultByWs;
    return resolveDefaultAgent(agents, wsId, userId, (a) =>
      canAssignAgent(a, userId, role),
    );
  }, [agents, wsId, userId, role, defaultByWs]);

  const [recording, setRecording] = useState(false);
  const [pickerOpen, setPickerOpen] = useState(false);
  const recordingRef = useRef(false);

  const pulse = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, {
          toValue: 1,
          duration: 1400,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true,
        }),
        Animated.timing(pulse, {
          toValue: 0,
          duration: 1400,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true,
        }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [pulse]);

  const eqBars = useRef<Animated.Value[]>(
    Array.from({ length: EQ_BAR_COUNT }, () => new Animated.Value(0)),
  ).current;

  useEffect(() => {
    if (!recording) {
      eqBars.forEach((v) => v.setValue(0));
      return;
    }
    const loops = eqBars.map((v) =>
      Animated.loop(
        Animated.sequence([
          Animated.timing(v, {
            toValue: 1,
            duration: 450,
            easing: Easing.inOut(Easing.sin),
            useNativeDriver: true,
          }),
          Animated.timing(v, {
            toValue: 0,
            duration: 450,
            easing: Easing.inOut(Easing.sin),
            useNativeDriver: true,
          }),
        ]),
      ),
    );
    const composite = Animated.stagger(150, loops);
    composite.start();
    return () => composite.stop();
  }, [recording, eqBars]);

  const selectAgent = useCallback(
    (agent: Agent) => {
      if (!wsId) return;
      void setDefaultAgent(wsId, agent.id);
      setPickerOpen(false);
    },
    [wsId, setDefaultAgent],
  );

  const onPressIn = useCallback(() => {
    if (recordingRef.current) return;
    recordingRef.current = true;
    setRecording(true);
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
  }, []);

  const onPressOut = useCallback(() => {
    if (!recordingRef.current) return;
    recordingRef.current = false;
    setRecording(false);
    void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    showToast(VOICE_PROTOTYPE_TOAST);
  }, [showToast]);

  return (
    <View className="flex-1 bg-background">
      <VoicePrototypeBanner />
      <ScrollView
        contentContainerClassName="px-4 pt-3 pb-10 gap-5"
        bounces={false}
        keyboardShouldPersistTaps="handled"
      >
        <View className="gap-2">
          <View className="flex-row items-center justify-between px-1">
            <Text className="text-[13px] font-semibold text-muted-foreground">
              发给谁
            </Text>
            <Pressable
              onPress={() => {
                if (usable.length === 0) {
                  showToast("暂无可用数字员工");
                  return;
                }
                setPickerOpen(true);
              }}
              hitSlop={8}
              className="flex-row items-center gap-0.5 active:opacity-70"
            >
              <Text className="text-[12px] font-medium text-brand">全部</Text>
              <Icon name="ChevronRight" size={14} color={t.brand} />
            </Pressable>
          </View>

          {usable.length === 0 ? (
            <ElevatedSurface className="border-0 px-4 py-5 items-center gap-1">
              <Text className="text-sm text-muted-foreground">
                暂无可用数字员工
              </Text>
            </ElevatedSurface>
          ) : (
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={{ gap: 10, paddingVertical: 2 }}
            >
              {usable.map((agent) => {
                const on = target?.id === agent.id;
                return (
                  <Pressable
                    key={agent.id}
                    onPress={() => selectAgent(agent)}
                    className="items-center gap-1.5 active:opacity-85"
                    style={{ width: 64 }}
                    accessibilityLabel={`发给 ${agent.name}`}
                    accessibilityState={{ selected: on }}
                  >
                    <View
                      style={{
                        borderRadius: 22,
                        borderWidth: on ? 2 : 0,
                        borderColor: t.brand,
                        padding: on ? 2 : 0,
                      }}
                    >
                      <ActorAvatar
                        type="agent"
                        id={agent.id}
                        size={40}
                        showPresence
                      />
                    </View>
                    <Text
                      className={cn(
                        "text-[11px] text-center",
                        on
                          ? "font-semibold text-brand"
                          : "font-medium text-muted-foreground",
                      )}
                      numberOfLines={1}
                    >
                      {agent.name}
                    </Text>
                  </Pressable>
                );
              })}
            </ScrollView>
          )}

          {target ? (
            <ElevatedSurface className="border-0 overflow-hidden mt-1">
              <View className="flex-row items-center gap-3 px-4 py-3">
                <ActorAvatar type="agent" id={target.id} size={40} showPresence />
                <View className="flex-1 min-w-0">
                  <Text className="text-[11px] text-muted-foreground mb-0.5">
                    当前接收人
                  </Text>
                  <Text
                    className="text-[15px] font-bold text-foreground"
                    numberOfLines={1}
                  >
                    {target.name}
                  </Text>
                </View>
                <Text
                  className={cn("text-xs", agentStatusLabel(target).tone)}
                >
                  {agentStatusLabel(target).label}
                </Text>
              </View>
            </ElevatedSurface>
          ) : null}
        </View>

        <View className="items-center pt-2 gap-4">
          <Text className="text-[15px] font-semibold text-foreground">
            {recording ? "正在聆听…" : "按住说话"}
          </Text>
          <Text className="text-[12px] text-muted-foreground text-center px-6">
            {recording
              ? "松开结束（原型不会真正发送）"
              : "按住即可说话，松开结束"}
          </Text>

          <View
            className="items-center justify-center"
            style={{ width: 220, height: 220 }}
          >
            <Animated.View
              pointerEvents="none"
              style={[
                styles.halo,
                {
                  opacity: pulse.interpolate({
                    inputRange: [0, 1],
                    outputRange: [0.18, 0.42],
                  }),
                  transform: [
                    {
                      scale: pulse.interpolate({
                        inputRange: [0, 1],
                        outputRange: [0.92, 1.08],
                      }),
                    },
                  ],
                  backgroundColor: recording
                    ? "rgba(59,111,255,0.35)"
                    : "rgba(59,111,255,0.18)",
                },
              ]}
            />
            <Pressable
              onPressIn={onPressIn}
              onPressOut={onPressOut}
              accessibilityLabel="按住说话"
              accessibilityHint="按住即可说话，松开结束"
              style={styles.orbShadow}
            >
              <LinearGradient
                colors={
                  recording
                    ? ["#2F62F0", "#3B6FFF", "#5B8AFF"]
                    : colorScheme === "dark"
                      ? ["#2A3348", "#1E2536"]
                      : ["#E8EEFF", "#F5F7FC"]
                }
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.orb}
              >
                {recording ? (
                  <View style={styles.eqRow}>
                    {eqBars.map((v, i) => (
                      <Animated.View
                        key={i}
                        style={[
                          styles.eqBar,
                          {
                            transform: [
                              {
                                scaleY: v.interpolate({
                                  inputRange: [0, 1],
                                  outputRange: [0.33, 1],
                                }),
                              },
                            ],
                          },
                        ]}
                      />
                    ))}
                  </View>
                ) : (
                  <Icon
                    name="Mic"
                    size={36}
                    color={t.brand}
                    strokeWidth={2.2}
                  />
                )}
              </LinearGradient>
            </Pressable>
          </View>

          <View
            className="rounded-2xl px-4 py-3 w-full"
            style={{ backgroundColor: well }}
          >
            <Text className="text-[12px] text-muted-foreground text-center leading-5">
              原型演示 · 松开后仅提示，不会写入工作台对话。
              {target ? ` 当前目标：${target.name}` : ""}
            </Text>
          </View>
        </View>
      </ScrollView>

      <RecipientPickerModal
        visible={pickerOpen}
        agents={usable}
        currentId={target?.id ?? null}
        onPick={selectAgent}
        onClose={() => setPickerOpen(false)}
      />
    </View>
  );
}

/** Matches staff-picker row style (avatar · name · binding · status). */
function RecipientPickerModal({
  visible,
  agents,
  currentId,
  onPick,
  onClose,
}: {
  visible: boolean;
  agents: Agent[];
  currentId: string | null;
  onPick: (agent: Agent) => void;
  onClose: () => void;
}) {
  const { colorScheme } = useColorScheme();
  const t = THEME[colorScheme];

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <Pressable
        className="flex-1 justify-end"
        style={{ backgroundColor: "rgba(0,0,0,0.4)" }}
        onPress={onClose}
      >
        <Pressable
          onPress={() => {}}
          className="rounded-t-3xl overflow-hidden"
          style={{
            backgroundColor: colorScheme === "dark" ? t.card : "#FFFFFF",
            maxHeight: "72%",
          }}
        >
          <View className="items-center pt-2 pb-1">
            <View
              className="w-9 h-1 rounded-full"
              style={{ backgroundColor: t.border }}
            />
          </View>
          <View className="px-4 pb-2 pt-1">
            <Text className="text-center text-[15px] font-semibold text-foreground">
              选择接收员工
            </Text>
            <Text className="text-center text-xs text-muted-foreground mt-1">
              与派单列表相同 · 选中后用于发语音目标
            </Text>
          </View>

          <ScrollView
            bounces={false}
            contentContainerStyle={{ paddingBottom: 28 }}
          >
            {agents.map((agent) => {
              const selected = agent.id === currentId;
              const bound = isAgentRuntimeBound(agent);
              const status = agentStatusLabel(agent);
              return (
                <Pressable
                  key={agent.id}
                  onPress={() => onPick(agent)}
                  className={cn(
                    "flex-row items-center gap-3 px-4 py-3 active:bg-secondary",
                    selected && "bg-secondary/60",
                  )}
                >
                  <ActorAvatar
                    type="agent"
                    id={agent.id}
                    size={40}
                    showPresence
                  />
                  <View className="flex-1 min-w-0">
                    <Text
                      className="text-base font-medium text-foreground"
                      numberOfLines={1}
                    >
                      {agent.name}
                    </Text>
                    <Text
                      className="text-xs text-muted-foreground mt-0.5"
                      numberOfLines={1}
                    >
                      {bound ? "工位已绑定" : "未绑定工位"}
                    </Text>
                  </View>
                  <Text className={cn("text-xs", status.tone)}>
                    {status.label}
                  </Text>
                  {selected ? (
                    <Icon name="Check" size={18} color={t.brand} strokeWidth={2.4} />
                  ) : null}
                </Pressable>
              );
            })}
          </ScrollView>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  halo: {
    position: "absolute",
    width: 200,
    height: 200,
    borderRadius: 100,
  },
  orbShadow: {
    borderRadius: 80,
    shadowColor: "#3B6FFF",
    shadowOpacity: 0.28,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 8 },
    elevation: 6,
  },
  orb: {
    width: 160,
    height: 160,
    borderRadius: 80,
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
  },
  eqRow: {
    flexDirection: "row",
    alignItems: "flex-end",
    gap: 5,
    height: 44,
  },
  eqBar: {
    width: 5,
    height: 44,
    borderRadius: 2.5,
    backgroundColor: "#FFFFFF",
    transformOrigin: "bottom",
  },
});

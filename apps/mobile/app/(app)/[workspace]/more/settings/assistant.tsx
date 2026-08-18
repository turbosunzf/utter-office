/**
 * 秘书设置 — default agent + voice prefs (PRD §8.4).
 */
import { Pressable, ScrollView, Switch, View } from "react-native";
import { useQuery } from "@tanstack/react-query";
import { router } from "expo-router";
import SegmentedControl from "@react-native-segmented-control/segmented-control";
import { Text } from "@/components/ui/text";
import { SectionGroup } from "@/components/ui/section-group";
import { agentListOptions } from "@/data/queries/agents";
import {
  useAssistantHydration,
  useAssistantStore,
  type HoldThresholdMs,
  type VoiceSheetDefault,
} from "@/data/stores/assistant-store";
import { useWorkspaceStore } from "@/data/workspace-store";
import { useColorScheme } from "@/lib/use-color-scheme";
import { THEME } from "@/lib/theme";

const HOLD_OPTIONS: HoldThresholdMs[] = [500, 1000, 2000];
const HOLD_LABELS = ["0.5s", "1s", "2s"];
const SHEET_OPTIONS: VoiceSheetDefault[] = ["record", "translate", "talk"];
const SHEET_LABELS = ["录音", "翻译", "发语音"];

export default function AssistantSettingsPage() {
  const wsId = useWorkspaceStore((s) => s.currentWorkspaceId);
  const wsSlug = useWorkspaceStore((s) => s.currentWorkspaceSlug);
  useAssistantHydration(wsId);
  const { data: agents = [] } = useQuery(agentListOptions(wsId));
  const defaultId = useAssistantStore((s) =>
    wsId ? s.defaultAgentByWs[wsId] : undefined,
  );
  const holdThresholdMs = useAssistantStore((s) => s.holdThresholdMs);
  const autoJump = useAssistantStore((s) => s.autoJumpWorkbench);
  const sheetDefault = useAssistantStore((s) => s.voiceSheetDefault);
  const setHold = useAssistantStore((s) => s.setHoldThresholdMs);
  const setAutoJump = useAssistantStore((s) => s.setAutoJumpWorkbench);
  const setSheet = useAssistantStore((s) => s.setVoiceSheetDefault);
  const { colorScheme } = useColorScheme();
  const t = THEME[colorScheme];

  const defaultAgent = agents.find(
    (a) => a.id === defaultId && !a.archived_at,
  );
  const defaultLabel = defaultAgent?.name ?? "未设置";

  return (
    <ScrollView
      className="flex-1 bg-background"
      contentContainerClassName="px-4 py-4 gap-5 pb-12"
    >
      <SectionGroup title="默认数字员工">
        <Pressable
          onPress={() => {
            if (!wsSlug) return;
            router.push({
              pathname: "/[workspace]/staff-picker",
              params: { workspace: wsSlug, intent: "default" },
            });
          }}
          className="flex-row items-center px-4 py-3.5 active:bg-secondary"
        >
          <Text className="flex-1 text-sm text-foreground">默认员工</Text>
          <Text className="text-[13px] text-muted-foreground mr-1">
            {defaultLabel}
          </Text>
          <Text className="text-muted-foreground">›</Text>
        </Pressable>
      </SectionGroup>

      <SectionGroup title="语音">
        <View className="px-4 py-3 gap-2 border-b border-border">
          <Text className="text-sm text-foreground">长按录音阈值</Text>
          <SegmentedControl
            values={HOLD_LABELS}
            selectedIndex={HOLD_OPTIONS.indexOf(holdThresholdMs)}
            onChange={(e) => {
              const i = e.nativeEvent.selectedSegmentIndex;
              void setHold(HOLD_OPTIONS[i] ?? 500);
            }}
            tintColor={t.brand}
          />
        </View>
        <View className="px-4 py-3 border-b border-border gap-1">
          <View className="flex-row items-center">
            <Text className="flex-1 text-sm text-foreground">
              松手后自动跳工作台
            </Text>
            <Switch
              value={autoJump}
              onValueChange={(v) => void setAutoJump(v)}
              trackColor={{ true: t.brand }}
            />
          </View>
          <Text className="text-[11px] text-muted-foreground leading-[15px]">
            预留开关。中央长按仍按现网：松手 Toast，不跳转、不发送。
          </Text>
        </View>
        <View className="px-4 py-3 gap-2">
          <Text className="text-sm text-foreground">语音入口默认项</Text>
          <SegmentedControl
            values={SHEET_LABELS}
            selectedIndex={SHEET_OPTIONS.indexOf(sheetDefault)}
            onChange={(e) => {
              const i = e.nativeEvent.selectedSegmentIndex;
              void setSheet(SHEET_OPTIONS[i] ?? "talk");
            }}
            tintColor={t.brand}
          />
        </View>
      </SectionGroup>

      <SectionGroup title="简报推送">
        <View className="px-4 py-4 opacity-55">
          <Text className="text-sm text-muted-foreground">
            分类与推送时间待后端 `/api/briefs` 契约（B-2）后开放。
          </Text>
        </View>
      </SectionGroup>
    </ScrollView>
  );
}

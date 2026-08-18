/**
 * Board issue row — dense list line aligned with prototype `.iss`.
 */
import { Pressable, View } from "react-native";
import type { Issue } from "@multica/core/types";
import { Text } from "@/components/ui/text";
import { ActorAvatar } from "@/components/ui/actor-avatar";
import { StatusIcon } from "@/components/ui/status-icon";
import { PRIORITY_LABEL } from "@/lib/issue-status";
import { useColorScheme } from "@/lib/use-color-scheme";
import { THEME } from "@/lib/theme";

interface Props {
  issue: Issue;
  projectTitle?: string | null;
  running?: boolean;
  onPress: () => void;
  onLongPress: () => void;
  onPressRunning?: () => void;
}

export function BoardIssueCard({
  issue,
  projectTitle,
  running = false,
  onPress,
  onLongPress,
  onPressRunning,
}: Props) {
  const hasAssignee = !!(issue.assignee_type && issue.assignee_id);
  const { colorScheme } = useColorScheme();
  const t = THEME[colorScheme];
  const pri = issue.priority;
  const priHi = pri === "high";
  const priUrg = pri === "urgent";

  return (
    <Pressable
      onPress={onPress}
      onLongPress={onLongPress}
      delayLongPress={350}
      className="flex-row items-center gap-2 py-3 px-2 active:opacity-80"
      accessibilityLabel={`${issue.identifier} ${issue.title}`}
    >
      <StatusIcon status={issue.status} size={10} />
      <View className="flex-1 min-w-0">
        <Text className="text-[14px] font-semibold text-foreground" numberOfLines={1}>
          <Text className="font-bold text-brand">{issue.identifier}</Text>
          {" · "}
          {issue.title}
        </Text>
        <View className="flex-row items-center gap-1.5 mt-0.5 flex-wrap">
          {priUrg ? (
            <Tag bg="rgba(239,68,68,0.1)" color={t.destructive} label="紧急" />
          ) : priHi ? (
            <Tag bg="rgba(245,158,11,0.12)" color={t.priority} label="高" />
          ) : pri !== "none" ? (
            <Tag
              bg={colorScheme === "dark" ? t.secondary : "#F3F4F8"}
              color={t.mutedForeground}
              label={PRIORITY_LABEL[pri]}
            />
          ) : null}
          {running ? (
            <Pressable
              onPress={onPressRunning}
              hitSlop={8}
              className="rounded px-1.5 py-0.5 bg-brand/15"
            >
              <Text className="text-[11px] font-bold text-brand">需介入</Text>
            </Pressable>
          ) : null}
          {issue.status === "blocked" ? (
            <Tag bg="rgba(239,68,68,0.1)" color={t.destructive} label="受阻" />
          ) : null}
          {projectTitle ? (
            <Text className="text-[12px] text-muted-foreground" numberOfLines={1}>
              {projectTitle}
            </Text>
          ) : null}
        </View>
      </View>
      {hasAssignee ? (
        <ActorAvatar
          type={issue.assignee_type!}
          id={issue.assignee_id!}
          size={22}
          showPresence
        />
      ) : (
        <View className="w-[22px]" />
      )}
    </Pressable>
  );
}

function Tag({
  bg,
  color,
  label,
}: {
  bg: string;
  color: string;
  label: string;
}) {
  return (
    <View className="rounded px-1.5 py-0.5" style={{ backgroundColor: bg }}>
      <Text className="text-[11px] font-semibold" style={{ color }}>
        {label}
      </Text>
    </View>
  );
}

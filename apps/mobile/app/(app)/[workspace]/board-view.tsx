/**
 * Board filter sheet — status + priority only.
 * Native Stack header avoids formSheet grabber covering the title row.
 */
import { useLayoutEffect } from "react";
import { Pressable, ScrollView, View } from "react-native";
import { useNavigation } from "expo-router";
import { Text } from "@/components/ui/text";
import { StatusIcon } from "@/components/ui/status-icon";
import { PriorityIcon } from "@/components/ui/priority-icon";
import { useBoardViewStore } from "@/data/stores/board-view-store";
import {
  BOARD_STATUSES,
  PRIORITY_LABEL,
  STATUS_LABEL,
} from "@/lib/issue-status";
import type { IssuePriority, IssueStatus } from "@multica/core/types";
import { cn } from "@/lib/utils";

const PRIORITIES: IssuePriority[] = [
  "urgent",
  "high",
  "medium",
  "low",
  "none",
];

export default function BoardViewSheet() {
  const navigation = useNavigation();
  const statusFilters = useBoardViewStore((s) => s.statusFilters);
  const priorityFilters = useBoardViewStore((s) => s.priorityFilters);
  const toggleStatus = useBoardViewStore((s) => s.toggleStatusFilter);
  const togglePriority = useBoardViewStore((s) => s.togglePriorityFilter);
  const clearFilters = useBoardViewStore((s) => s.clearFilters);

  const hasFilters =
    statusFilters.length > 0 || priorityFilters.length > 0;

  useLayoutEffect(() => {
    navigation.setOptions({
      headerRight: hasFilters
        ? () => (
            <Pressable onPress={clearFilters} hitSlop={8} className="px-1">
              <Text className="text-sm font-medium text-brand">重置</Text>
            </Pressable>
          )
        : undefined,
    });
  }, [navigation, hasFilters, clearFilters]);

  return (
    <View className="flex-1 bg-background">
      <ScrollView
        className="flex-1"
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingTop: 4, paddingBottom: 32 }}
      >
        <SectionLabel>状态</SectionLabel>
        {[...BOARD_STATUSES, "cancelled" as IssueStatus].map((status) => {
          const checked = statusFilters.includes(status);
          return (
            <Pressable
              key={status}
              onPress={() => toggleStatus(status)}
              className={cn(
                "flex-row items-center gap-3 px-4 py-2.5 active:bg-secondary",
                checked && "bg-secondary/60",
              )}
            >
              <StatusIcon status={status} size={16} />
              <Text className="flex-1 text-sm text-foreground">
                {STATUS_LABEL[status]}
              </Text>
              <Check checked={checked} />
            </Pressable>
          );
        })}

        <SectionLabel>优先级</SectionLabel>
        {PRIORITIES.map((priority) => {
          const checked = priorityFilters.includes(priority);
          return (
            <Pressable
              key={priority}
              onPress={() => togglePriority(priority)}
              className={cn(
                "flex-row items-center gap-3 px-4 py-2.5 active:bg-secondary",
                checked && "bg-secondary/60",
              )}
            >
              <PriorityIcon priority={priority} />
              <Text className="flex-1 text-sm text-foreground">
                {PRIORITY_LABEL[priority]}
              </Text>
              <Check checked={checked} />
            </Pressable>
          );
        })}
      </ScrollView>
    </View>
  );
}

function SectionLabel({ children }: { children: string }) {
  return (
    <Text className="px-4 pt-3 pb-1 text-xs font-medium text-muted-foreground uppercase tracking-wider">
      {children}
    </Text>
  );
}

function Check({ checked }: { checked: boolean }) {
  return (
    <View
      className={cn(
        "size-5 rounded-full border items-center justify-center",
        checked ? "bg-brand border-brand" : "border-border",
      )}
    >
      {checked ? (
        <Text className="text-[10px] text-white font-bold">✓</Text>
      ) : null}
    </View>
  );
}

/**
 * 我的待办 — full list of issues assigned to me, reached from the home tab's
 * "全部待办" footer.
 *
 * Restored as a PUSHED route rather than the old `(tabs)/my-issues.tsx` tab:
 * the 5-tab redesign (step ①) removed the "事项" tab, but the data layer —
 * `myIssueListOptions`, `useMyIssuesRealtime`, the `my-issues-view-store` —
 * was left wired for exactly this surface. The home tab's todo preview reads
 * the same "assigned" scope, so the numbers agree (apps/mobile/CLAUDE.md
 * same-N rule).
 *
 * Scope is fixed to "assigned" — the todo list's semantics. The old tab's
 * created/agents scope tabs and filter sheet are out of scope for step ③.
 * Status grouping mirrors `more/issues.tsx` and the deleted my-issues tab:
 * SectionList in `BOARD_STATUSES` order, empty sections dropped.
 */
import { useMemo } from "react";
import { SectionList, View } from "react-native";
import { useQuery } from "@tanstack/react-query";
import { router } from "expo-router";
import type { Issue, IssueStatus } from "@multica/core/types";
import { Text } from "@/components/ui/text";
import { Button } from "@/components/ui/button";
import { StatusIcon } from "@/components/ui/status-icon";
import { IssueRow } from "@/components/issue/issue-row";
import { IssuesLoading } from "@/components/issue/issues-loading";
import {
  buildMyIssuesFilter,
  myIssueListOptions,
} from "@/data/queries/my-issues";
import { useAuthStore } from "@/data/auth-store";
import { useWorkspaceStore } from "@/data/workspace-store";
import { BOARD_STATUSES, STATUS_LABEL } from "@/lib/issue-status";

type IssueSection = { status: IssueStatus; data: Issue[] };

export default function MyIssues() {
  const userId = useAuthStore((s) => s.user?.id ?? null);
  const wsId = useWorkspaceStore((s) => s.currentWorkspaceId);
  const wsSlug = useWorkspaceStore((s) => s.currentWorkspaceSlug);

  const filter = useMemo(
    () =>
      userId
        ? buildMyIssuesFilter("assigned", userId)
        : { assignee_id: "" },
    [userId],
  );

  const { data, isLoading, error, refetch, isRefetching } = useQuery({
    ...myIssueListOptions(wsId, "assigned", filter),
    enabled: !!wsId && !!userId,
  });

  const sections = useMemo<IssueSection[]>(() => {
    const issues = data ?? [];
    if (issues.length === 0) return [];
    const byStatus = new Map<IssueStatus, Issue[]>();
    for (const issue of issues) {
      const list = byStatus.get(issue.status);
      if (list) list.push(issue);
      else byStatus.set(issue.status, [issue]);
    }
    return BOARD_STATUSES
      .map((status) => ({ status, data: byStatus.get(status) ?? [] }))
      .filter((s) => s.data.length > 0);
  }, [data]);

  const showEmpty = !isLoading && !error && sections.length === 0;

  return (
    <View className="flex-1 bg-background">
      {isLoading ? (
        <IssuesLoading />
      ) : error ? (
        <View className="px-4 gap-3 pt-4">
          <Text className="text-sm text-destructive">
            Failed to load issues:{" "}
            {error instanceof Error ? error.message : "unknown error"}
          </Text>
          <Button variant="outline" onPress={() => refetch()}>
            <Text>Retry</Text>
          </Button>
        </View>
      ) : showEmpty ? (
        <View className="flex-1 items-center justify-center px-6">
          <Text className="text-sm text-muted-foreground text-center">
            没有指派给你的事项。
          </Text>
        </View>
      ) : (
        <SectionList
          sections={sections}
          keyExtractor={(item) => item.id}
          stickySectionHeadersEnabled={false}
          ItemSeparatorComponent={() => (
            <View className="h-px bg-border ml-4" />
          )}
          renderSectionHeader={({ section }) => (
            <View className="flex-row items-center gap-2 px-4 py-2 bg-background">
              <StatusIcon status={section.status} size={14} />
              <Text className="text-xs uppercase tracking-wider text-muted-foreground font-medium">
                {STATUS_LABEL[section.status]}
              </Text>
              <Text className="text-xs text-muted-foreground/60">
                {section.data.length}
              </Text>
            </View>
          )}
          contentContainerClassName="pb-6"
          renderItem={({ item }) => (
            <IssueRow
              issue={item}
              onPress={() => {
                if (wsSlug) router.push(`/${wsSlug}/issue/${item.id}`);
              }}
            />
          )}
          refreshing={isRefetching}
          onRefresh={refetch}
        />
      )}
    </View>
  );
}

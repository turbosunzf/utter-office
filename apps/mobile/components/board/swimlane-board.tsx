/**
 * Swimlane board — SectionList by project; incomplete issues in each lane.
 * Unassigned-to-project issues go to a trailing「未归属项目」section.
 */
import { useCallback, useMemo } from "react";
import {
  ActionSheetIOS,
  Pressable,
  SectionList,
  View,
} from "react-native";
import { useQuery } from "@tanstack/react-query";
import { router } from "expo-router";
import type { Issue, IssueStatus, Project } from "@multica/core/types";
import { Text } from "@/components/ui/text";
import { BoardIssueCard } from "@/components/board/board-issue-card";
import { issueListOptions } from "@/data/queries/issues";
import { projectListOptions } from "@/data/queries/projects";
import { useUpdateIssue } from "@/data/mutations/issues";
import { useWorkspaceStore } from "@/data/workspace-store";
import { useBoardViewStore } from "@/data/stores/board-view-store";
import { BOARD_STATUSES, STATUS_LABEL } from "@/lib/issue-status";
import { filterIssues } from "@/lib/filter-issues";

type Section = {
  key: string;
  title: string;
  project: Project | null;
  data: Issue[];
};

function applyBoardFilters(
  issues: Issue[],
  projectId: string | null,
  statusFilters: IssueStatus[],
  priorityFilters: ReturnType<typeof useBoardViewStore.getState>["priorityFilters"],
  assigneeKey: string | null,
): Issue[] {
  let next = filterIssues(issues, statusFilters, priorityFilters);
  if (projectId) next = next.filter((i) => i.project_id === projectId);
  if (assigneeKey) {
    const [type, id] = assigneeKey.split(":");
    next = next.filter(
      (i) => i.assignee_type === type && i.assignee_id === id,
    );
  }
  return next;
}

export function SwimlaneBoard() {
  const wsId = useWorkspaceStore((s) => s.currentWorkspaceId);
  const wsSlug = useWorkspaceStore((s) => s.currentWorkspaceSlug);
  const projectId = useBoardViewStore((s) => s.projectId);
  const statusFilters = useBoardViewStore((s) => s.statusFilters);
  const priorityFilters = useBoardViewStore((s) => s.priorityFilters);
  const assigneeKey = useBoardViewStore((s) => s.assigneeKey);

  const { data: issues = [], isLoading, error, refetch } = useQuery(
    issueListOptions(wsId),
  );
  const { data: projects = [] } = useQuery(projectListOptions(wsId));

  const filtered = useMemo(
    () =>
      applyBoardFilters(
        issues,
        projectId,
        statusFilters,
        priorityFilters,
        assigneeKey,
      ),
    [issues, projectId, statusFilters, priorityFilters, assigneeKey],
  );

  // Incomplete only by default (done/cancelled collapsed out of lanes).
  const openIssues = useMemo(
    () =>
      filtered.filter(
        (i) => i.status !== "done" && i.status !== "cancelled",
      ),
    [filtered],
  );

  const sections = useMemo<Section[]>(() => {
    const byProject = new Map<string | null, Issue[]>();
    for (const issue of openIssues) {
      const key = issue.project_id ?? null;
      const list = byProject.get(key) ?? [];
      list.push(issue);
      byProject.set(key, list);
    }
    const out: Section[] = [];
    for (const p of projects) {
      if (projectId && p.id !== projectId) continue;
      const data = byProject.get(p.id) ?? [];
      if (data.length === 0 && projectId == null) continue;
      out.push({
        key: p.id,
        title: p.title,
        project: p,
        data,
      });
    }
    const unassigned = byProject.get(null) ?? [];
    if (unassigned.length > 0 && !projectId) {
      out.push({
        key: "__none__",
        title: "未归属项目",
        project: null,
        data: unassigned,
      });
    }
    return out;
  }, [openIssues, projects, projectId]);

  const openIssue = useCallback(
    (id: string) => {
      if (wsSlug) router.push(`/${wsSlug}/issue/${id}`);
    },
    [wsSlug],
  );

  if (isLoading) {
    return (
      <View className="flex-1 items-center justify-center">
        <Text className="text-sm text-muted-foreground">加载中…</Text>
      </View>
    );
  }
  if (error) {
    return (
      <View className="flex-1 items-center justify-center gap-2 px-8">
        <Text className="text-sm text-destructive">加载失败</Text>
        <Pressable onPress={() => refetch()}>
          <Text className="text-sm text-brand">重试</Text>
        </Pressable>
      </View>
    );
  }

  return (
    <SectionList
      sections={sections}
      keyExtractor={(i) => i.id}
      contentContainerClassName="px-4 pb-8"
      stickySectionHeadersEnabled={false}
      ListEmptyComponent={
        <Text className="text-sm text-muted-foreground text-center py-12">
          暂无进行中的事项
        </Text>
      }
      renderSectionHeader={({ section }) => (
        <Pressable
          onPress={() => {
            if (section.project && wsSlug) {
              router.push(`/${wsSlug}/project/${section.project.id}`);
            }
          }}
          disabled={!section.project}
          className="pt-4 pb-2 flex-row items-center justify-between"
        >
          <Text className="text-sm font-bold text-foreground">
            {section.project?.icon
              ? `${section.project.icon} ${section.title}`
              : section.title}
          </Text>
          <Text className="text-xs text-muted-foreground">
            {section.data.length}
          </Text>
        </Pressable>
      )}
      renderItem={({ item }) => (
        <View className="mb-2.5">
          <SwimCard issue={item} onOpen={openIssue} />
        </View>
      )}
    />
  );
}

function SwimCard({
  issue,
  onOpen,
}: {
  issue: Issue;
  onOpen: (id: string) => void;
}) {
  const update = useUpdateIssue(issue.id);
  const onLongPress = () => {
    const statuses: IssueStatus[] = [...BOARD_STATUSES, "cancelled"];
    const options = [
      "取消",
      ...statuses.map((s) => `移到 ${STATUS_LABEL[s]}`),
      "打开详情",
    ];
    ActionSheetIOS.showActionSheetWithOptions(
      { options, cancelButtonIndex: 0, title: issue.identifier },
      (i) => {
        if (i === 0) return;
        if (i === options.length - 1) {
          onOpen(issue.id);
          return;
        }
        const next = statuses[i - 1];
        if (next && next !== issue.status) update.mutate({ status: next });
      },
    );
  };

  return (
    <BoardIssueCard
      issue={issue}
      onPress={() => onOpen(issue.id)}
      onLongPress={onLongPress}
    />
  );
}

/**
 * Column board — horizontal paging FlatList, one status column per page.
 * Long-press card → ActionSheet to change status / open detail.
 */
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ActionSheetIOS,
  Animated,
  Dimensions,
  Easing,
  FlatList,
  Pressable,
  View,
  type NativeScrollEvent,
  type NativeSyntheticEvent,
} from "react-native";
import { useQuery } from "@tanstack/react-query";
import { router } from "expo-router";
import type { Issue, IssueStatus } from "@multica/core/types";
import { Text } from "@/components/ui/text";
import { Icon } from "@/components/ui/icon";
import { StatusIcon } from "@/components/ui/status-icon";
import { BoardIssueCard } from "@/components/board/board-issue-card";
import { issueListOptions } from "@/data/queries/issues";
import { projectListOptions } from "@/data/queries/projects";
import { useUpdateIssue } from "@/data/mutations/issues";
import { useWorkspaceStore } from "@/data/workspace-store";
import { useBoardViewStore } from "@/data/stores/board-view-store";
import { BOARD_STATUSES, STATUS_LABEL } from "@/lib/issue-status";
import { filterIssues } from "@/lib/filter-issues";
import { useColorScheme } from "@/lib/use-color-scheme";
import { THEME } from "@/lib/theme";

const PAGE_GUTTER = 28;
const PAGE_PEEK = 22;

function pageWidth(): number {
  return Dimensions.get("window").width - PAGE_GUTTER;
}

function filterBoardIssues(
  issues: Issue[],
  projectId: string | null,
  statusFilters: IssueStatus[],
  priorityFilters: ReturnType<typeof useBoardViewStore.getState>["priorityFilters"],
  assigneeKey: string | null,
): Issue[] {
  let next = filterIssues(issues, statusFilters, priorityFilters);
  if (projectId) {
    next = next.filter((i) => i.project_id === projectId);
  }
  if (assigneeKey) {
    const [type, id] = assigneeKey.split(":");
    next = next.filter(
      (i) => i.assignee_type === type && i.assignee_id === id,
    );
  }
  return next;
}

export function ColumnBoard() {
  const wsId = useWorkspaceStore((s) => s.currentWorkspaceId);
  const wsSlug = useWorkspaceStore((s) => s.currentWorkspaceSlug);
  const projectId = useBoardViewStore((s) => s.projectId);
  const statusFilters = useBoardViewStore((s) => s.statusFilters);
  const priorityFilters = useBoardViewStore((s) => s.priorityFilters);
  const assigneeKey = useBoardViewStore((s) => s.assigneeKey);
  const { colorScheme } = useColorScheme();
  const t = THEME[colorScheme];

  const { data: issues = [], isLoading, error, refetch } = useQuery(
    issueListOptions(wsId),
  );
  const { data: projects = [] } = useQuery(projectListOptions(wsId));
  const projectTitleById = useMemo(() => {
    const m = new Map<string, string>();
    for (const p of projects) m.set(p.id, p.title);
    return m;
  }, [projects]);

  const filtered = useMemo(
    () =>
      filterBoardIssues(
        issues,
        projectId,
        statusFilters,
        priorityFilters,
        assigneeKey,
      ),
    [issues, projectId, statusFilters, priorityFilters, assigneeKey],
  );

  const columns = useMemo(() => {
    return BOARD_STATUSES.map((status) => ({
      status,
      data: filtered.filter((i) => i.status === status),
    }));
  }, [filtered]);

  const width = pageWidth();
  const listRef = useRef<FlatList>(null);
  const [page, setPage] = useState(0);
  const [hintVisible, setHintVisible] = useState(true);
  const hintOpacity = useRef(new Animated.Value(1)).current;
  const nudgeX = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(nudgeX, {
          toValue: 1,
          duration: 900,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true,
        }),
        Animated.timing(nudgeX, {
          toValue: 0,
          duration: 900,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true,
        }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [nudgeX]);

  const dismissHint = useCallback(() => {
    if (!hintVisible) return;
    setHintVisible(false);
    Animated.timing(hintOpacity, {
      toValue: 0,
      duration: 220,
      useNativeDriver: true,
    }).start();
  }, [hintVisible, hintOpacity]);

  const onScrollEnd = (e: NativeSyntheticEvent<NativeScrollEvent>) => {
    const x = e.nativeEvent.contentOffset.x;
    const idx = Math.round(x / (width + PAGE_PEEK));
    setPage(Math.max(0, Math.min(idx, columns.length - 1)));
    dismissHint();
  };

  const openIssue = useCallback(
    (id: string) => {
      if (wsSlug) router.push(`/${wsSlug}/issue/${id}`);
    },
    [wsSlug],
  );

  const openRuns = useCallback(
    (id: string) => {
      if (wsSlug) router.push(`/${wsSlug}/issue/${id}/runs`);
    },
    [wsSlug],
  );

  const goPage = (idx: number) => {
    const next = Math.max(0, Math.min(idx, columns.length - 1));
    listRef.current?.scrollToOffset({
      offset: next * (width + PAGE_PEEK),
      animated: true,
    });
    setPage(next);
    dismissHint();
  };

  if (isLoading) {
    return (
      <View className="flex-1 items-center justify-center px-8">
        <Text className="text-sm text-muted-foreground">加载中…</Text>
      </View>
    );
  }
  if (error) {
    return (
      <View className="flex-1 items-center justify-center px-8 gap-3">
        <Text className="text-sm text-destructive text-center">
          加载事项失败
        </Text>
        <Pressable onPress={() => refetch()} className="px-3 py-2">
          <Text className="text-sm text-brand">重试</Text>
        </Pressable>
      </View>
    );
  }

  const current = columns[page];
  const canPrev = page > 0;
  const canNext = page < columns.length - 1;

  return (
    <View className="flex-1">
      <Animated.View
        pointerEvents={hintVisible ? "none" : "none"}
        style={{
          opacity: hintOpacity,
          position: "absolute",
          top: 6,
          alignSelf: "center",
          zIndex: 2,
        }}
      >
        <View
          className="flex-row items-center gap-1.5 rounded-full px-3 py-1.5"
          style={{
            backgroundColor:
              colorScheme === "dark" ? "rgba(59,111,255,0.28)" : "rgba(59,111,255,0.12)",
          }}
        >
          <Animated.View
            style={{
              transform: [
                {
                  translateX: nudgeX.interpolate({
                    inputRange: [0, 1],
                    outputRange: [0, 5],
                  }),
                },
              ],
            }}
          >
            <Icon name="ChevronLeft" size={12} color={t.brand} />
          </Animated.View>
          <Text className="text-[11px] font-medium text-brand">
            左右滑动切换状态列
          </Text>
          <Animated.View
            style={{
              transform: [
                {
                  translateX: nudgeX.interpolate({
                    inputRange: [0, 1],
                    outputRange: [0, -5],
                  }),
                },
              ],
            }}
          >
            <Icon name="ChevronRight" size={12} color={t.brand} />
          </Animated.View>
        </View>
      </Animated.View>

      <FlatList
        ref={listRef}
        horizontal
        pagingEnabled={false}
        decelerationRate="fast"
        snapToInterval={width + PAGE_PEEK}
        snapToAlignment="start"
        disableIntervalMomentum
        showsHorizontalScrollIndicator={false}
        data={columns}
        keyExtractor={(c) => c.status}
        onMomentumScrollEnd={onScrollEnd}
        onScrollBeginDrag={dismissHint}
        contentContainerStyle={{ paddingHorizontal: 14, paddingTop: hintVisible ? 36 : 8 }}
        renderItem={({ item: col }) => (
          <ColumnPage
            status={col.status}
            issues={col.data}
            pageIndex={BOARD_STATUSES.indexOf(col.status)}
            pageCount={BOARD_STATUSES.length}
            width={width}
            peek={PAGE_PEEK}
            projectTitleById={projectTitleById}
            onOpenIssue={openIssue}
            onOpenRuns={openRuns}
            dimmed={false}
          />
        )}
      />

      <View className="px-4 pb-3 pt-1 gap-2">
        <View className="flex-row items-center justify-between">
          <Pressable
            onPress={() => goPage(page - 1)}
            disabled={!canPrev}
            hitSlop={8}
            className="flex-row items-center gap-0.5 px-1 py-1"
            style={{ opacity: canPrev ? 1 : 0.28 }}
          >
            <Icon name="ChevronLeft" size={16} color={t.brand} />
            <Text className="text-[11px] font-medium text-brand">
              {canPrev
                ? STATUS_LABEL[columns[page - 1]!.status]
                : " "}
            </Text>
          </Pressable>
          <Text className="text-[12px] font-semibold text-foreground">
            {current ? STATUS_LABEL[current.status] : ""} · {page + 1}/
            {columns.length}
          </Text>
          <Pressable
            onPress={() => goPage(page + 1)}
            disabled={!canNext}
            hitSlop={8}
            className="flex-row items-center gap-0.5 px-1 py-1"
            style={{ opacity: canNext ? 1 : 0.28 }}
          >
            <Text className="text-[11px] font-medium text-brand">
              {canNext
                ? STATUS_LABEL[columns[page + 1]!.status]
                : " "}
            </Text>
            <Icon name="ChevronRight" size={16} color={t.brand} />
          </Pressable>
        </View>
        <View className="flex-row justify-center gap-1.5">
          {columns.map((c, i) => {
            const on = i === page;
            return (
              <Pressable
                key={c.status}
                onPress={() => goPage(i)}
                hitSlop={6}
                style={{
                  width: on ? 18 : 7,
                  height: 7,
                  borderRadius: 4,
                  backgroundColor: on ? t.brand : t.border,
                }}
              />
            );
          })}
        </View>
      </View>
    </View>
  );
}

function ColumnPage({
  status,
  issues,
  pageIndex,
  pageCount,
  width,
  peek,
  projectTitleById,
  onOpenIssue,
  onOpenRuns,
}: {
  status: IssueStatus;
  issues: Issue[];
  pageIndex: number;
  pageCount: number;
  width: number;
  peek: number;
  projectTitleById: Map<string, string>;
  onOpenIssue: (id: string) => void;
  onOpenRuns: (id: string) => void;
  dimmed?: boolean;
}) {
  const { colorScheme } = useColorScheme();
  const t = THEME[colorScheme];

  return (
    <View style={{ width: width + peek, paddingRight: peek }}>
      <View
        className="rounded-2xl px-3 pt-3 pb-1 mb-2"
        style={{
          backgroundColor: colorScheme === "dark" ? t.card : "#FFFFFF",
          borderWidth: 1,
          borderColor:
            colorScheme === "dark" ? t.border : "rgba(15,23,42,0.06)",
          minHeight: 280,
        }}
      >
        <View className="flex-row items-center justify-between mb-2.5">
          <View className="flex-row items-center gap-2">
            <StatusIcon status={status} size={14} />
            <Text className="text-sm font-bold text-foreground">
              {STATUS_LABEL[status]}
            </Text>
            <View
              className="rounded-full px-1.5 py-0.5"
              style={{
                backgroundColor:
                  colorScheme === "dark"
                    ? "rgba(255,255,255,0.08)"
                    : "rgba(15,23,42,0.06)",
              }}
            >
              <Text className="text-[10px] font-semibold text-muted-foreground">
                {issues.length}
              </Text>
            </View>
          </View>
          <Text className="text-[10px] text-muted-foreground">
            {pageIndex + 1}/{pageCount}
          </Text>
        </View>
        <FlatList
          data={issues}
          keyExtractor={(i) => i.id}
          contentContainerClassName="gap-2.5 pb-4"
          ListEmptyComponent={
            <Text className="text-sm text-muted-foreground py-8 text-center">
              此列暂无事项
            </Text>
          }
          renderItem={({ item }) => (
            <BoardCardWithActions
              issue={item}
              projectTitle={
                item.project_id
                  ? projectTitleById.get(item.project_id)
                  : undefined
              }
              onOpenIssue={onOpenIssue}
              onOpenRuns={onOpenRuns}
            />
          )}
        />
      </View>
    </View>
  );
}

function BoardCardWithActions({
  issue,
  projectTitle,
  onOpenIssue,
  onOpenRuns,
}: {
  issue: Issue;
  projectTitle?: string;
  onOpenIssue: (id: string) => void;
  onOpenRuns: (id: string) => void;
}) {
  const update = useUpdateIssue(issue.id);

  const onLongPress = () => {
    const statuses: IssueStatus[] = [
      ...BOARD_STATUSES,
      "cancelled",
    ];
    const options = [
      "取消",
      ...statuses.map((s) => `移到 ${STATUS_LABEL[s]}`),
      "打开详情",
    ];
    ActionSheetIOS.showActionSheetWithOptions(
      {
        options,
        cancelButtonIndex: 0,
        title: issue.identifier,
      },
      (i) => {
        if (i === 0) return;
        if (i === options.length - 1) {
          onOpenIssue(issue.id);
          return;
        }
        const next = statuses[i - 1];
        if (next && next !== issue.status) {
          update.mutate({ status: next });
        }
      },
    );
  };

  return (
    <BoardIssueCard
      issue={issue}
      projectTitle={projectTitle}
      onPress={() => onOpenIssue(issue.id)}
      onLongPress={onLongPress}
      onPressRunning={() => onOpenRuns(issue.id)}
    />
  );
}

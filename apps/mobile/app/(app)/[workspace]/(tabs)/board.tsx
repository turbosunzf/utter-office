/**
 * 看板 tab — M3：进度 | 列 | 泳道。
 * 默认进度视图；项目 chip 仅在列/泳道显示。
 */
import { useCallback } from "react";
import { ActionSheetIOS, Pressable, View } from "react-native";
import { router } from "expo-router";
import { useQuery } from "@tanstack/react-query";
import { Text } from "@/components/ui/text";
import { Header } from "@/components/ui/header";
import { Icon } from "@/components/ui/icon";
import { IconButton } from "@/components/ui/icon-button";
import { ColumnBoard } from "@/components/board/column-board";
import { SwimlaneBoard } from "@/components/board/swimlane-board";
import { BoardProgressView } from "@/components/board/board-progress-view";
import { BlockingNoticeBar } from "@/components/shared/blocking-notice-bar";
import {
  boardHasActiveFilters,
  useBoardViewStore,
  type BoardViewMode,
} from "@/data/stores/board-view-store";
import { projectListOptions } from "@/data/queries/projects";
import { useWorkspaceStore } from "@/data/workspace-store";
import { useClearFiltersOnWorkspaceChange } from "@/lib/use-clear-filters-on-workspace-change";
import { useColorScheme } from "@/lib/use-color-scheme";
import { THEME } from "@/lib/theme";
import { cn } from "@/lib/utils";

const MODES: { value: BoardViewMode; label: string }[] = [
  { value: "progress", label: "整盘" },
  { value: "columns", label: "按状态" },
  { value: "swimlanes", label: "按人" },
];

export default function Board() {
  const wsId = useWorkspaceStore((s) => s.currentWorkspaceId);
  const wsSlug = useWorkspaceStore((s) => s.currentWorkspaceSlug);
  const mode = useBoardViewStore((s) => s.mode);
  const setMode = useBoardViewStore((s) => s.setMode);
  const projectId = useBoardViewStore((s) => s.projectId);
  const setProjectId = useBoardViewStore((s) => s.setProjectId);
  const hasFilters = useBoardViewStore(boardHasActiveFilters);
  const { colorScheme } = useColorScheme();
  const t = THEME[colorScheme];
  const well = colorScheme === "dark" ? t.secondary : "#EEF1F8";

  useClearFiltersOnWorkspaceChange(
    useCallback(() => useBoardViewStore.getState().reset(), []),
    wsId,
  );

  const { data: projects = [] } = useQuery(projectListOptions(wsId));
  const projectLabel =
    projectId == null
      ? "全部项目"
      : (projects.find((p) => p.id === projectId)?.title ?? "项目");

  const showProjectChip = mode !== "progress";

  const go = (path: string) => {
    if (wsSlug) router.push(`/${wsSlug}${path}`);
  };

  const pickProject = () => {
    const options = ["取消", "全部项目", ...projects.map((p) => p.title)];
    ActionSheetIOS.showActionSheetWithOptions(
      {
        options,
        cancelButtonIndex: 0,
        title: "选择项目",
      },
      (i) => {
        if (i === 0) return;
        if (i === 1) {
          setProjectId(null);
          return;
        }
        const project = projects[i - 2];
        if (project) setProjectId(project.id);
      },
    );
  };

  const headerRight = (
    <>
      <Pressable
        onPress={() => go("/board-view")}
        accessibilityLabel="筛选"
        className="relative h-9 w-9 items-center justify-center active:opacity-70"
      >
        <Icon name="Filter" size={20} color={t.foreground} />
        {hasFilters ? (
          <View className="absolute right-1 top-1 size-2 rounded-full bg-destructive" />
        ) : null}
      </Pressable>
      <IconButton
        name="Search"
        onPress={() => go("/search")}
        accessibilityLabel="搜索"
      />
      <IconButton
        name="Plus"
        iconSize={24}
        onPress={() => go("/new-issue")}
        accessibilityLabel="新建事项"
      />
    </>
  );

  return (
    <View className="flex-1 bg-background">
      <Header title="看板" right={headerRight} />
      <BlockingNoticeBar />
      <View className="px-4 pt-2 pb-2 gap-2">
        <View
          className="flex-row rounded-2xl p-1"
          style={{ backgroundColor: well }}
        >
          {MODES.map((m) => {
            const on = mode === m.value;
            return (
              <Pressable
                key={m.value}
                onPress={() => setMode(m.value)}
                className="flex-1 items-center rounded-xl py-2.5 active:opacity-90"
                style={{
                  backgroundColor: on ? t.brand : "transparent",
                  shadowColor: on ? "#3B6FFF" : "transparent",
                  shadowOpacity: on ? 0.22 : 0,
                  shadowRadius: 6,
                  shadowOffset: { width: 0, height: 2 },
                }}
              >
                <Text
                  className={cn(
                    "text-[13px] font-semibold",
                    on ? "text-white" : "text-muted-foreground",
                  )}
                >
                  {m.label}
                </Text>
              </Pressable>
            );
          })}
        </View>

        {showProjectChip ? (
          <View className="flex-row items-center gap-2">
            <Pressable
              onPress={pickProject}
              accessibilityLabel={`项目：${projectLabel}`}
              className="flex-1 flex-row items-center gap-2 rounded-xl px-3 py-2.5 active:opacity-80"
              style={{
                backgroundColor:
                  colorScheme === "dark" ? t.secondary : "#FFFFFF",
                borderWidth: 1,
                borderColor: t.border,
              }}
            >
              <View
                className="size-7 items-center justify-center rounded-lg"
                style={{ backgroundColor: "rgba(59,111,255,0.12)" }}
              >
                <Icon name="Folder" size={14} color={t.brand} />
              </View>
              <Text
                className="flex-1 text-[13px] font-medium text-foreground"
                numberOfLines={1}
              >
                {projectLabel}
              </Text>
              <Text className="text-[11px] text-muted-foreground">切换 ▾</Text>
            </Pressable>
            {hasFilters ? (
              <View className="rounded-full bg-brand/15 px-2.5 py-1.5">
                <Text className="text-[10px] font-medium text-brand">已筛选</Text>
              </View>
            ) : null}
          </View>
        ) : (
          <Text className="text-[11px] text-muted-foreground px-0.5">
            整盘工作区度量 · 与项目筛选无关
          </Text>
        )}
      </View>

      {mode === "columns" ? (
        <ColumnBoard />
      ) : mode === "swimlanes" ? (
        <SwimlaneBoard />
      ) : (
        <BoardProgressView />
      )}
    </View>
  );
}

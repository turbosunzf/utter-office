import { useMemo } from "react";
import { View } from "react-native";
import { useQuery } from "@tanstack/react-query";
import { Text } from "@/components/ui/text";
import { SectionGroup } from "@/components/ui/section-group";
import { Skeleton } from "@/components/ui/skeleton";
import { Markdown } from "@/lib/markdown";
import { issueTimelineOptions } from "@/data/queries/issues";
import { useWorkspaceStore } from "@/data/workspace-store";

/**
 * COD-16「AI 秘书产出」is the landing issue where 数据分析官 posts the
 * Markdown analysis report. The board card reads that issue's timeline and
 * renders the latest comment whose body contains the `数据分析报告` marker;
 * until the first report lands, it shows a placeholder (acceptance criterion
 * "分析报告无数据时显示占位").
 *
 * The issue UUID + marker are backend-driven (数据分析官 writes to the COD-16
 * landing issue) and are out of scope to change here. This component only
 * degrades gracefully: query error (e.g. the workspace has no such issue) and
 * "no report yet" intentionally share the same placeholder — the report card
 * is never a hard-failure surface.
 */
export const SECRETARY_ISSUE_ID = "30c7b240-55a9-4aab-bafe-b09b25f3dba0";
export const REPORT_MARKER = "数据分析报告";

export function ReportCard() {
  const wsId = useWorkspaceStore((s) => s.currentWorkspaceId);
  const { data, isPending } = useQuery(
    issueTimelineOptions(wsId, SECRETARY_ISSUE_ID),
  );

  const report = useMemo(() => {
    // Query error leaves `data` undefined → timeline stays [] → we fall
    // through to the shared placeholder below (never an error surface).
    // Guard here (inside the memo) so a malformed / missing payload can't
    // throw and the memo deps stay on the stable `data` reference.
    const timeline = Array.isArray(data) ? data : [];
    // Timeline arrives ASC — the latest matching report wins. Defensive
    // against malformed rows: a non-comment or non-string content entry
    // can't throw here.
    for (let i = timeline.length - 1; i >= 0; i--) {
      const entry = timeline[i];
      if (
        entry.type === "comment" &&
        typeof entry.content === "string" &&
        entry.content.includes(REPORT_MARKER)
      ) {
        return entry.content;
      }
    }
    return null;
  }, [data]);

  return (
    <SectionGroup title="数据分析报告">
      <View className="p-4">
        {isPending ? (
          <Skeleton className="h-20 w-full" />
        ) : report ? (
          <Markdown content={report} compact />
        ) : (
          <View className="gap-1">
            <Text className="text-sm text-foreground">报告生成中</Text>
            <Text className="text-xs text-muted-foreground">
              数据分析官产出的报告将显示在这里，暂无数据时显示此占位。
            </Text>
          </View>
        )}
      </View>
    </SectionGroup>
  );
}

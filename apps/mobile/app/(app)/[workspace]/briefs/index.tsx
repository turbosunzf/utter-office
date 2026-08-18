/**
 * Daily industry brief list — category tabs, ranked rows.
 */
import { useMemo, useState } from "react";
import { ScrollView, View } from "react-native";
import { useQuery } from "@tanstack/react-query";
import { router, useLocalSearchParams } from "expo-router";
import { todayDateOnly } from "@multica/core/issues/date";
import { Text } from "@/components/ui/text";
import { BriefTabs } from "@/components/home/brief-tabs";
import { BriefRow } from "@/components/home/brief-row";
import { briefListOptions } from "@/data/queries/briefs";
import { BRIEF_TABS, briefsOnDay, filterBriefsByTab } from "@/data/mocks/briefs";
import { useWorkspaceStore } from "@/data/workspace-store";

function initialTab(raw: string | string[] | undefined): string {
  const value = Array.isArray(raw) ? raw[0] : raw;
  if (value && BRIEF_TABS.some((t) => t.id === value)) return value;
  return "all";
}

export default function BriefsListPage() {
  const { tab: tabParam } = useLocalSearchParams<{ tab?: string }>();
  const wsId = useWorkspaceStore((s) => s.currentWorkspaceId);
  const wsSlug = useWorkspaceStore((s) => s.currentWorkspaceSlug);
  const { data: briefs = [] } = useQuery(briefListOptions(wsId));
  const [tab, setTab] = useState(() => initialTab(tabParam));
  const date = todayDateOnly();

  const items = useMemo(
    () => filterBriefsByTab(briefsOnDay(briefs, date), tab),
    [briefs, date, tab],
  );

  return (
    <View className="flex-1 bg-background">
      <View className="bg-card">
        <BriefTabs tab={tab} onChange={setTab} />
      </View>

      <ScrollView contentContainerClassName="pb-10 bg-card">
        {items.length === 0 ? (
          <View className="items-center px-6 py-20 gap-1">
            <Text className="text-sm text-muted-foreground">
              该分类暂无简报
            </Text>
          </View>
        ) : (
          items.map((b, i) => (
            <BriefRow
              key={b.id}
              brief={b}
              rank={i + 1}
              onPress={() => {
                if (wsSlug) router.push(`/${wsSlug}/brief/${b.id}`);
              }}
            />
          ))
        )}
      </ScrollView>
    </View>
  );
}

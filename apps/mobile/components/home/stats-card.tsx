/**
 * Home stats cards — the three personal-dimension KPIs on the redesigned home
 * tab (step ③): 进行中任务 / 近 7 天完成 / 运行中智能体.
 *
 * Presentational only: values are aggregated in `(tabs)/home.tsx` from
 * existing endpoints (my-issues list + presence map) — no new API, and the
 * component imports nothing from `@multica/core` (not even types). Colours
 * arrive as resolved THEME-token strings from the caller, so dark mode is
 * handled upstream via `useColorScheme()` without any logic here.
 *
 * A `null` value renders an em-dash rather than a misleading zero while the
 * backing query is still loading.
 */
import { View } from "react-native";
import { Icon, type AppIconName } from "@/components/ui/icon";
import { Text } from "@/components/ui/text";

export interface HomeStat {
    icon: AppIconName;
  /** Card label (fixed Chinese copy — the app's UI language). */
  label: string;
  /** `null` → still loading, render an em-dash instead of a fake zero. */
  value: number | null;
  /** Icon tint — a resolved THEME token (e.g. `THEME[colorScheme].brand`). */
  tint: string;
}

export function StatsGrid({ stats }: { stats: HomeStat[] }) {
  return (
    <View className="flex-row gap-3 px-4">
      {stats.map((stat) => (
        <StatsCard key={stat.label} stat={stat} />
      ))}
    </View>
  );
}

function StatsCard({ stat }: { stat: HomeStat }) {
  return (
    <View className="flex-1 rounded-md border border-border bg-card p-3 gap-2">
      <Icon name={stat.icon} size={18} color={stat.tint} />
      <Text className="text-2xl font-bold text-foreground">
        {stat.value == null ? "—" : String(stat.value)}
      </Text>
      <Text className="text-xs text-muted-foreground">{stat.label}</Text>
    </View>
  );
}

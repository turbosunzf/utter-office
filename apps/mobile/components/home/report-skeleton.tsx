/**
 * Home report-card skeleton — M1 shell only. Real day/week/month aggregation
 * lands in M2. A-class metrics must never fake zeros; placeholders use ——.
 */
import { View } from "react-native";
import { Text } from "@/components/ui/text";
import { SectionGroup } from "@/components/ui/section-group";

export function ReportSkeleton() {
  return (
    <View className="px-4">
      <SectionGroup title="数据报告">
        <View className="px-4 py-4 gap-4">
          <View className="flex-row justify-between gap-3">
            {[
              { label: "新建事项", value: "——" },
              { label: "已完成", value: "——" },
              { label: "员工运行", value: "——" },
            ].map((m) => (
              <View key={m.label} className="flex-1 items-center gap-1">
                <Text className="text-xl font-semibold text-muted-foreground">
                  {m.value}
                </Text>
                <Text className="text-xs text-muted-foreground">{m.label}</Text>
              </View>
            ))}
          </View>
          <Text className="text-xs text-muted-foreground text-center">
            进行中 —— · 待评审 —— · 受阻 —— · 失败 ——
          </Text>
          <Text className="text-[11px] text-muted-foreground/80 text-center">
            部分统计接口未上线
          </Text>
        </View>
      </SectionGroup>
    </View>
  );
}

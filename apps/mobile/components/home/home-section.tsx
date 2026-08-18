/**
 * Home / board section card — title sits inside the white card (sec-bar).
 */
import type { ReactNode } from "react";
import { View } from "react-native";
import { Text } from "@/components/ui/text";
import { ElevatedSurface } from "@/components/ui/elevated-surface";
import { useColorScheme } from "@/lib/use-color-scheme";
import { THEME } from "@/lib/theme";

export function HomeSection({
  title,
  meta,
  badge,
  right,
  children,
  flush,
}: {
  title: string;
  meta?: ReactNode;
  badge?: string;
  right?: ReactNode;
  children: ReactNode;
  flush?: boolean;
}) {
  const { colorScheme } = useColorScheme();
  const t = THEME[colorScheme];
  const barBg = colorScheme === "dark" ? t.card : "#FAFBFD";

  return (
    <ElevatedSurface
      className="border-0 overflow-hidden"
      style={{
        borderWidth: 1,
        borderColor:
          colorScheme === "dark" ? t.border : "rgba(15,23,42,0.06)",
      }}
    >
      <View
        className="flex-row items-center justify-between gap-2 px-4 py-3"
        style={{
          backgroundColor: barBg,
          borderBottomWidth: 1,
          borderBottomColor:
            colorScheme === "dark" ? t.border : "rgba(220,224,232,0.85)",
        }}
      >
        <View className="flex-row items-center gap-2 flex-1 min-w-0">
          <View
            className="w-[3px] h-3.5 rounded-sm"
            style={{ backgroundColor: t.brand }}
          />
          <Text className="text-[15px] font-extrabold text-foreground">
            {title}
          </Text>
          {meta}
          {badge ? (
            <View className="rounded-full border border-border px-2 py-0.5">
              <Text className="text-[11px] text-muted-foreground">{badge}</Text>
            </View>
          ) : null}
        </View>
        {right}
      </View>
      <View className={flush ? "" : "px-4 py-3"}>{children}</View>
    </ElevatedSurface>
  );
}

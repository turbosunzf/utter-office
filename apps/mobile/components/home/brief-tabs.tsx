import { Pressable, ScrollView } from "react-native";
import { Text } from "@/components/ui/text";
import { BRIEF_TABS } from "@/data/mocks/briefs";
import { useColorScheme } from "@/lib/use-color-scheme";
import { THEME } from "@/lib/theme";

export function BriefTabs({
  tab,
  onChange,
  onAccent,
}: {
  tab: string;
  onChange: (id: string) => void;
  onAccent?: boolean;
}) {
  const { colorScheme } = useColorScheme();
  const t = THEME[colorScheme];
  const active = onAccent
    ? "#FFFFFF"
    : colorScheme === "dark"
      ? t.foreground
      : "#111111";
  const idle = onAccent
    ? "rgba(255,255,255,0.72)"
    : colorScheme === "dark"
      ? t.mutedForeground
      : "#5C5C5C";

  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={{
        paddingHorizontal: 16,
        paddingTop: onAccent ? 6 : 10,
        paddingBottom: 6,
        gap: 18,
        alignItems: "flex-end",
      }}
    >
      {BRIEF_TABS.map((tb) => {
        const on = tab === tb.id;
        return (
          <Pressable
            key={tb.id}
            onPress={() => onChange(tb.id)}
            hitSlop={{ top: 8, bottom: 8 }}
            accessibilityRole="tab"
            accessibilityState={{ selected: on }}
            style={{
              paddingBottom: 4,
              borderBottomWidth: 2,
              borderBottomColor: on ? active : "transparent",
            }}
          >
            <Text
              style={{
                fontSize: 14,
                fontWeight: on ? "800" : "500",
                color: on ? active : idle,
              }}
            >
              {tb.label}
            </Text>
          </Pressable>
        );
      })}
    </ScrollView>
  );
}

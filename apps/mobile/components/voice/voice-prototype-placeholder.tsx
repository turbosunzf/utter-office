/**
 * Shared prototype placeholder for the voice MVP screens (录音 / 翻译).
 *
 * These screens are intentionally non-functional: they prove the voice
 * entry navigation resolves on device. Each renders a large SF Symbol
 * glyph, a title, and a "coming soon" caption so the user can tell at a
 * glance the route rendered. Real recording / ASR / translation land in
 * follow-up issues.
 *
 * Visual conventions follow apps/mobile/CLAUDE.md: SF Symbols via
 * expo-image (`sf:`), colours through THEME tokens. The pushed route's
 * native Stack header supplies the title + back button, so this body
 * draws no Header of its own (same as more/pins.tsx).
 */
import { View } from "react-native";
import { Image } from "expo-image";
import { Text } from "@/components/ui/text";
import { useColorScheme } from "@/lib/use-color-scheme";
import { THEME } from "@/lib/theme";

export function VoicePrototypePlaceholder({
  title,
  icon,
  description,
}: {
  title: string;
  /** SF Symbol name, rendered via expo-image `source: "sf:<name>"`. */
  icon: string;
  description: string;
}) {
  const { colorScheme } = useColorScheme();
  const t = THEME[colorScheme];

  return (
    <View className="flex-1 bg-background">
      <View className="flex-1 items-center justify-center px-8 gap-4">
        <View
          className="size-24 rounded-3xl items-center justify-center"
          style={{ backgroundColor: t.secondary }}
        >
          <Image
            source={`sf:${icon}`}
            tintColor={t.foreground}
            style={{ width: 40, height: 40 }}
          />
        </View>
        <Text className="text-lg font-semibold text-foreground text-center">
          {title}
        </Text>
        <Text className="text-sm text-muted-foreground text-center leading-5">
          {description}
        </Text>
        <Text className="text-xs text-muted-foreground text-center">
          原型占位 · 功能开发中
        </Text>
      </View>
    </View>
  );
}

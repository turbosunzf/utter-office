/**
 * Mobile screen header — tab-root chrome (NOT Stack headers).
 * Soft bottom hairline + larger title for the four main tabs.
 */
import type { ReactNode } from "react";
import { View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Text } from "@/components/ui/text";
import { useColorScheme } from "@/lib/use-color-scheme";

interface Props {
  title?: string;
  subtitle?: string;
  center?: ReactNode;
  left?: ReactNode;
  right?: ReactNode;
}

export function Header({ title, subtitle, center, left, right }: Props) {
  const { colorScheme } = useColorScheme();
  const hairline =
    colorScheme === "dark" ? "rgba(255,255,255,0.08)" : "rgba(15,23,42,0.06)";

  return (
    <SafeAreaView edges={["top"]} className="bg-background">
      <View
        className="flex-row items-center px-3"
        style={{
          minHeight: subtitle || center ? 56 : 52,
          paddingTop: 4,
          paddingBottom: 10,
          borderBottomWidth: 1,
          borderBottomColor: hairline,
        }}
      >
        {left ? <View className="flex-row items-center mr-1">{left}</View> : null}
        <View className="flex-1 px-1 justify-center min-w-0" style={{ flexShrink: 1 }}>
          {center ?? (
            title ? (
              <View className="gap-0.5">
                <Text
                  className="text-[22px] font-bold text-foreground"
                  style={{ letterSpacing: -0.4 }}
                  numberOfLines={1}
                >
                  {title}
                </Text>
                {subtitle ? (
                  <Text
                    className="text-[12px] text-muted-foreground"
                    numberOfLines={1}
                  >
                    {subtitle}
                  </Text>
                ) : null}
              </View>
            ) : null
          )}
        </View>
        {right ? (
          <View
            className="flex-row items-center gap-0.5"
            style={{ flexShrink: 0, maxWidth: "55%" }}
          >
            {right}
          </View>
        ) : null}
      </View>
    </SafeAreaView>
  );
}

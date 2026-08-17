/**
 * Soft elevated section group — title sits above the card (iOS Settings feel).
 */
import type { ReactNode } from "react";
import { View } from "react-native";
import { Text } from "@/components/ui/text";
import { ElevatedSurface } from "@/components/ui/elevated-surface";

export function SectionGroup({
  title,
  right,
  children,
}: {
  title?: string;
  right?: ReactNode;
  children: ReactNode;
}) {
  return (
    <View className="gap-2">
      {title || right ? (
        <View className="flex-row items-center justify-between px-1">
          {title ? (
            <Text className="text-[13px] font-semibold text-muted-foreground tracking-wide">
              {title}
            </Text>
          ) : (
            <View />
          )}
          {right ?? null}
        </View>
      ) : null}
      <ElevatedSurface className="border-0">{children}</ElevatedSurface>
    </View>
  );
}

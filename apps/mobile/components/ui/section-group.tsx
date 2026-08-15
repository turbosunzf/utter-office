import type { ReactNode } from "react";
import { View } from "react-native";
import { Text } from "@/components/ui/text";

/**
 * iOS-style grouped list section — an uppercase label over a single card
 * (rounded border) that stacks rows with separators between them.
 *
 * Shared by the Settings page and the 我的 (mine) tab. `title` is optional
 * so a section can render as a bare card — mine's top identity + workspace
 * card mirrors the old More popover's UserCard + WorkspaceCard stacking
 * without a section label.
 */
export function SectionGroup({
  title,
  children,
}: {
  title?: string;
  children: ReactNode;
}) {
  return (
    <View className="gap-2">
      {title ? (
        <Text className="text-xs uppercase tracking-wider text-muted-foreground px-1">
          {title}
        </Text>
      ) : null}
      <View className="rounded-md border border-border bg-card overflow-hidden">
        {children}
      </View>
    </View>
  );
}

import type { ReactNode } from "react";
import { Pressable, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { Text } from "@/components/ui/text";
import { cn } from "@/lib/utils";

/**
 * iOS-list-row navigation entry — leading slot (avatar / SF Symbol icon),
 * title + optional subtitle, and a trailing `chevron-forward` disclosure
 * indicator. Shared by the Settings page and the 我的 (mine) tab.
 *
 * `disabled` hides the chevron and drops the press effect — used by mine's
 * workspace card for single-workspace users, where switching is a no-op
 * (same behaviour the old More popover's WorkspaceCard had).
 */
export function NavRow({
  onPress,
  leading,
  title,
  subtitle,
  chevronColor,
  disabled = false,
  badge,
}: {
  onPress: () => void;
  leading?: ReactNode;
  title: string;
  subtitle?: string;
  chevronColor: string;
  disabled?: boolean;
  /** Unread count — same source as Tab badge when used for inbox. */
  badge?: number;
}) {
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      className={cn(
        "flex-row items-center px-4 py-3.5 active:bg-secondary gap-3",
      )}
    >
      {leading}
      <View className="flex-1">
        <Text className="text-base font-medium text-foreground">{title}</Text>
        {subtitle ? (
          <Text className="text-sm text-muted-foreground mt-0.5">
            {subtitle}
          </Text>
        ) : null}
      </View>
      {badge != null && badge > 0 ? (
        <View className="min-w-[20px] h-5 items-center justify-center rounded-full bg-brand px-1.5">
          <Text className="text-[11px] font-semibold text-white">
            {badge > 99 ? "99+" : String(badge)}
          </Text>
        </View>
      ) : null}
      {!disabled ? (
        <Ionicons name="chevron-forward" size={18} color={chevronColor} />
      ) : null}
    </Pressable>
  );
}

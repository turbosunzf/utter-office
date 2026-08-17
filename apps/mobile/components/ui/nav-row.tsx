import type { ReactNode } from "react";
import { Pressable, View } from "react-native";
import { Icon } from "@/components/ui/icon";
import { Text } from "@/components/ui/text";
import { cn } from "@/lib/utils";

/**
 * meet-think `_NavTile` style — plain leading icon, title, optional subtitle /
 * badge, trailing chevron. Shared by Settings and 我的.
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
  badge?: number;
}) {
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      className={cn(
        "flex-row items-center px-4 py-3.5 active:bg-secondary gap-3.5",
      )}
    >
      {leading}
      <View className="flex-1 min-w-0">
        <View className="flex-row items-center gap-2">
          <Text className="text-[16px] text-foreground" numberOfLines={1}>
            {title}
          </Text>
          {badge != null && badge > 0 ? (
            <View className="min-w-[18px] h-[18px] items-center justify-center rounded-full bg-brand px-1">
              <Text className="text-[10px] font-bold text-white leading-[12px]">
                {badge > 99 ? "99+" : String(badge)}
              </Text>
            </View>
          ) : null}
        </View>
        {subtitle ? (
          <Text className="text-[13px] text-muted-foreground mt-0.5" numberOfLines={1}>
            {subtitle}
          </Text>
        ) : null}
      </View>
      {!disabled ? (
        <Icon name="ChevronRight" size={18} color={chevronColor} />
      ) : null}
    </Pressable>
  );
}

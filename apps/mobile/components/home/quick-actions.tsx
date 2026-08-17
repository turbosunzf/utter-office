/**
 * Home quick-action grid — 4 fixed tiles (新建事项 / 派单 / 项目 / 收件箱).
 * Inbox badge must use the same `useInboxUnreadCount` as Tab badge (parity).
 */
import { Pressable, View } from "react-native";
import { Image as ExpoImage } from "expo-image";
import { Text } from "@/components/ui/text";
import { useColorScheme } from "@/lib/use-color-scheme";
import { THEME } from "@/lib/theme";

export interface QuickAction {
  key: string;
  label: string;
  icon: string;
  badge?: number;
  onPress: () => void;
}

export function QuickActions({ actions }: { actions: QuickAction[] }) {
  const { colorScheme } = useColorScheme();
  const t = THEME[colorScheme];

  return (
    <View className="flex-row gap-3 px-4">
      {actions.map((action) => (
        <Pressable
          key={action.key}
          onPress={action.onPress}
          accessibilityLabel={
            action.badge && action.badge > 0
              ? `${action.label}，${action.badge} 条未读`
              : action.label
          }
          className="flex-1 items-center gap-2 rounded-xl border border-border bg-card py-3 active:bg-secondary"
        >
          <View className="relative">
            <View
              className="items-center justify-center rounded-xl"
              style={{
                width: 40,
                height: 40,
                backgroundColor: t.secondary,
              }}
            >
              <ExpoImage
                source={`sf:${action.icon}`}
                tintColor={t.foreground}
                style={{ width: 20, height: 20 }}
              />
            </View>
            {action.badge != null && action.badge > 0 ? (
              <View className="absolute -right-1.5 -top-1.5 min-w-[16px] h-4 items-center justify-center rounded-full bg-brand px-1">
                <Text className="text-[10px] font-semibold text-white">
                  {action.badge > 99 ? "99+" : String(action.badge)}
                </Text>
              </View>
            ) : null}
          </View>
          <Text className="text-xs text-foreground" numberOfLines={1}>
            {action.label}
          </Text>
        </Pressable>
      ))}
    </View>
  );
}

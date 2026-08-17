/**
 * Bottom tab bar — 首页 / 看板 / 录音(中央) / 工作台 / 我的。
 * Icons: Lucide via shared Icon. Central Voice tab is not a nav target.
 */
import { Tabs } from "expo-router";
import { Platform, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useWorkspaceStore } from "@/data/workspace-store";
import { useColorScheme } from "@/lib/use-color-scheme";
import { THEME } from "@/lib/theme";
import {
  useInboxUnreadCount,
  useChatUnreadMessageCount,
} from "@/lib/unread-counts";
import { RecordButton } from "@/components/voice/record-button";
import { VoiceOverlay } from "@/components/voice/voice-overlay";
import { Icon, type AppIconName } from "@/components/ui/icon";

const BADGE_STYLE = {
  backgroundColor: THEME.light.brand,
  color: "#FFFFFF",
  fontSize: 10,
  fontWeight: "700" as const,
  lineHeight: 14,
  minWidth: 16,
  height: 16,
  borderRadius: 8,
  paddingHorizontal: 4,
  paddingVertical: 0,
  // iOS Text baseline sits high inside the pill — nudge down slightly.
  ...(Platform.OS === "ios"
    ? { paddingTop: 1, overflow: "hidden" as const }
    : { textAlignVertical: "center" as const, includeFontPadding: false }),
};

const TAB_BAR_CONTENT_HEIGHT = 64;

function TabGlyph({
  name,
  color,
  focused,
}: {
  name: AppIconName;
  color: string;
  focused: boolean;
}) {
  return (
    <View
      style={{
        width: 44,
        height: 30,
        alignItems: "center",
        justifyContent: "center",
        borderRadius: 10,
        backgroundColor: focused ? "rgba(59,111,255,0.12)" : "transparent",
      }}
    >
      <Icon
        name={name}
        size={22}
        color={color}
        strokeWidth={focused ? 2.35 : 1.85}
      />
    </View>
  );
}

export default function TabsLayout() {
  const { colorScheme } = useColorScheme();
  const t = THEME[colorScheme];
  const insets = useSafeAreaInsets();

  const wsId = useWorkspaceStore((s) => s.currentWorkspaceId);
  const inboxUnread = useInboxUnreadCount(wsId);
  const chatUnread = useChatUnreadMessageCount(wsId);

  const inboxBadge =
    inboxUnread > 0
      ? inboxUnread > 99
        ? "99+"
        : String(inboxUnread)
      : undefined;
  const chatBadge =
    chatUnread > 0
      ? chatUnread > 99
        ? "99+"
        : String(chatUnread)
      : undefined;

  const hairline =
    colorScheme === "dark" ? "rgba(255,255,255,0.08)" : "rgba(15,23,42,0.07)";
  const barBg = colorScheme === "dark" ? t.card : "#FFFFFF";

  return (
    <View style={{ flex: 1 }}>
      <Tabs
        screenOptions={{
          headerShown: false,
          tabBarActiveTintColor: t.brand,
          tabBarInactiveTintColor: t.mutedForeground,
          tabBarStyle: {
            backgroundColor: barBg,
            height: TAB_BAR_CONTENT_HEIGHT + insets.bottom,
            paddingTop: 6,
            borderTopWidth: 1,
            borderTopColor: hairline,
            elevation: 0,
            shadowOpacity: 0,
            ...(Platform.OS === "ios"
              ? {
                  shadowColor: "#0F172A",
                  shadowOpacity: colorScheme === "dark" ? 0 : 0.04,
                  shadowRadius: 8,
                  shadowOffset: { width: 0, height: -2 },
                }
              : null),
          },
          tabBarItemStyle: {
            paddingTop: 2,
          },
          tabBarLabelStyle: {
            fontSize: 10,
            fontWeight: "600",
            marginTop: 2,
            letterSpacing: 0.1,
          },
        }}
      >
        <Tabs.Screen
          name="home"
          options={{
            title: "首页",
            tabBarBadge: inboxBadge,
            tabBarBadgeStyle: BADGE_STYLE,
            tabBarIcon: ({ color, focused }) => (
              <TabGlyph name="Home" color={color} focused={focused} />
            ),
          }}
        />
        <Tabs.Screen
          name="board"
          options={{
            title: "看板",
            tabBarIcon: ({ color, focused }) => (
              <TabGlyph name="LayoutGrid" color={color} focused={focused} />
            ),
          }}
        />
        <Tabs.Screen
          name="voice"
          options={{
            title: "录音",
            tabBarButton: (props) => (
              <View
                style={[
                  props.style,
                  {
                    flex: 1,
                    alignItems: "center",
                    justifyContent: "center",
                  },
                ]}
                pointerEvents="box-none"
              >
                <RecordButton />
              </View>
            ),
            tabBarLabel: () => null,
            tabBarIcon: () => null,
          }}
          listeners={() => ({
            tabPress: (e) => {
              e.preventDefault();
            },
          })}
        />
        <Tabs.Screen
          name="workbench"
          options={{
            title: "工作台",
            tabBarBadge: chatBadge,
            tabBarBadgeStyle: BADGE_STYLE,
            tabBarIcon: ({ color, focused }) => (
              <TabGlyph name="Bot" color={color} focused={focused} />
            ),
          }}
        />
        <Tabs.Screen
          name="mine"
          options={{
            title: "我的",
            tabBarIcon: ({ color, focused }) => (
              <TabGlyph name="User" color={color} focused={focused} />
            ),
          }}
        />
      </Tabs>

      <VoiceOverlay />
    </View>
  );
}

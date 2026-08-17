/**
 * Bottom tab bar — JS `<Tabs>` from expo-router (react-navigation under the
 * hood). Five slots, reordered for the AI秘书 redesign:
 * 首页 - 看板 - 录音(central) - 聊天 - 我的.
 *
 * The central Voice tab is NOT a navigation target. Its custom
 * `tabBarButton` (RecordButton) owns the interaction — a <2s tap opens a
 * bottom sheet, a ≥2s hold enters a recording state and sends "你好" on
 * release — and `listeners.tabPress` preventDefault()s so the underlying
 * (tabs)/voice.tsx stub is never navigated to (same tab-as-action pattern
 * the old More/Voice dropdowns used).
 *
 * RecordButton and VoiceOverlay coordinate through `useVoiceStore`: the
 * button lives inside <Tabs> (as a tabBarButton) while the full-screen
 * sheet/ripple overlays render as siblings here so they stack above the
 * bar. See components/voice/record-button.tsx + voice-overlay.tsx.
 *
 * Active tint is brand blue per spec §1 (#3B6FFF); inactive uses the theme
 * token so dark mode picks a contrasting value automatically.
 */
import { Tabs } from "expo-router";
import { Image } from "expo-image";
import { View } from "react-native";
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

// Only override backgroundColor — @react-navigation/elements Badge internally
// sets borderRadius = size/2, height = size, minWidth = size, so a single
// character renders as a perfect circle. Text color is auto-derived from the
// backgroundColor luminance by Badge itself (white on brand blue).
const BADGE_STYLE = {
  backgroundColor: THEME.light.brand,
};

// The central record button is 58×58 and must not protrude (spec §1), so the
// tab bar's content band is raised from the default 49px to 60px — button
// sits vertically centred with 1px breathing room top and bottom. The
// safe-area inset is added as the bar's bottom padding by React Navigation.
const TAB_BAR_CONTENT_HEIGHT = 60;

export default function TabsLayout() {
  const { colorScheme } = useColorScheme();
  const t = THEME[colorScheme];
  const insets = useSafeAreaInsets();

  const wsId = useWorkspaceStore((s) => s.currentWorkspaceId);
  const inboxUnread = useInboxUnreadCount(wsId);
  const chatUnread = useChatUnreadMessageCount(wsId);

  // Truncation aligned with web's sidebar badges: 99+ for both. `undefined`
  // makes React Navigation hide the badge, so zero-count is a free no-op.
  const inboxBadge =
    inboxUnread > 0 ? (inboxUnread > 99 ? "99+" : String(inboxUnread)) : undefined;
  const chatBadge =
    chatUnread > 0 ? (chatUnread > 99 ? "99+" : String(chatUnread)) : undefined;

  return (
    <View style={{ flex: 1 }}>
      <Tabs
        screenOptions={{
          headerShown: false,
          tabBarActiveTintColor: t.brand,
          tabBarInactiveTintColor: t.mutedForeground,
          tabBarStyle: {
            backgroundColor: t.background,
            height: TAB_BAR_CONTENT_HEIGHT + insets.bottom,
          },
          tabBarLabelStyle: { fontSize: 10 },
        }}
      >
        <Tabs.Screen
          name="home"
          options={{
            title: "首页",
            tabBarBadge: inboxBadge,
            tabBarBadgeStyle: BADGE_STYLE,
            tabBarIcon: ({ color, size, focused }) => (
              <Image
                source={focused ? "sf:house.fill" : "sf:house"}
                tintColor={color}
                style={{ width: size, height: size }}
              />
            ),
          }}
        />
        <Tabs.Screen
          name="board"
          options={{
            title: "看板",
            tabBarIcon: ({ color, size, focused }) => (
              <Image
                source={
                  focused ? "sf:square.grid.2x2.fill" : "sf:square.grid.2x2"
                }
                tintColor={color}
                style={{ width: size, height: size }}
              />
            ),
          }}
        />
        <Tabs.Screen
          name="voice"
          options={{
            title: "录音",
            tabBarButton: () => <RecordButton />,
          }}
          listeners={() => ({
            tabPress: (e) => {
              // Voice tab is not a navigation target — the RecordButton
              // owns the tap/hold interaction (same tab-as-action pattern
              // the old Voice dropdown used).
              e.preventDefault();
            },
          })}
        />
        <Tabs.Screen
          name="chat"
          options={{
            title: "工作台",
            tabBarBadge: chatBadge,
            tabBarBadgeStyle: BADGE_STYLE,
            tabBarIcon: ({ color, size, focused }) => (
              <Image
                source={
                  focused ? "sf:person.2.wave.2.fill" : "sf:person.2.wave.2"
                }
                tintColor={color}
                style={{ width: size, height: size }}
              />
            ),
          }}
        />
        <Tabs.Screen
          name="mine"
          options={{
            title: "我的",
            tabBarIcon: ({ color, size, focused }) => (
              <Image
                source={focused ? "sf:person.fill" : "sf:person"}
                tintColor={color}
                style={{ width: size, height: size }}
              />
            ),
          }}
        />
      </Tabs>

      <VoiceOverlay />
    </View>
  );
}

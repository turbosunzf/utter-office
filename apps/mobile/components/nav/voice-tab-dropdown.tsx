/**
 * VoiceTabDropdownAnchor — popover opened by tapping the Voice tab, offering
 * the three voice entry points: 录音 / 翻译 / 长按发语音.
 *
 * Same "tab-as-action" pattern as MoreTabDropdownAnchor: the Voice tab is
 * NOT a navigation target — its `listeners.tabPress` calls preventDefault()
 * and opens this dropdown imperatively via the exposed TriggerRef. The
 * component is mounted as a sibling to <Tabs>, anchored over the Voice
 * tab's screen rect (the 4th of 5 tabs: right 20%, width 20%).
 *
 * Visual conventions match more-tab-dropdown.tsx: SF Symbols via expo-image,
 * THEME tokens, DropdownMenu from components/ui/dropdown-menu.
 */
import { Pressable, View } from "react-native";
import { Image as ExpoImage } from "expo-image";
import { router } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import type { TriggerRef } from "@rn-primitives/dropdown-menu";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
} from "@/components/ui/dropdown-menu";
import { Text } from "@/components/ui/text";
import { useWorkspaceStore } from "@/data/workspace-store";
import { useColorScheme } from "@/lib/use-color-scheme";
import { THEME } from "@/lib/theme";

// iOS bottom tab bar default height (above safe-area) — same constant as
// more-tab-dropdown.tsx.
const TAB_BAR_HEIGHT = 49;

interface VoiceNavItem {
  label: string;
  /** SF Symbol name, rendered via expo-image `source: "sf:<name>"`. */
  icon: string;
  /** Path under /:slug/ — final href is `/${slug}${path}`. */
  path: string;
}

const VOICE_ITEMS: VoiceNavItem[] = [
  { label: "录音", icon: "mic", path: "/voice-record" },
  { label: "翻译", icon: "character.bubble", path: "/voice-translate" },
  { label: "长按发语音", icon: "waveform", path: "/voice-talk" },
];

export function VoiceTabDropdownAnchor({
  triggerRef,
}: {
  triggerRef: React.RefObject<TriggerRef | null>;
}) {
  const insets = useSafeAreaInsets();
  const slug = useWorkspaceStore((s) => s.currentWorkspaceSlug);
  const { colorScheme } = useColorScheme();
  const t = THEME[colorScheme];

  return (
    <View
      pointerEvents="box-none"
      style={{
        position: "absolute",
        right: "20%",
        bottom: insets.bottom,
        width: "20%",
        height: TAB_BAR_HEIGHT,
      }}
    >
      <DropdownMenu>
        <DropdownMenuTrigger ref={triggerRef} asChild>
          {/* Invisible, non-tappable: the real tab button below catches all
              touches; we open this trigger imperatively via ref. The
              Pressable just provides a measurable rect for the popover. */}
          <Pressable
            pointerEvents="none"
            accessibilityElementsHidden
            importantForAccessibility="no-hide-descendants"
            style={{ width: "100%", height: "100%" }}
          />
        </DropdownMenuTrigger>

        <DropdownMenuContent
          side="top"
          align="center"
          sideOffset={6}
          className="w-56 p-2"
        >
          {VOICE_ITEMS.map((item) => (
            <DropdownMenuItem
              key={item.path}
              onPress={() => slug && router.push(`/${slug}${item.path}`)}
              accessibilityLabel={item.label}
              className="h-10 gap-3"
            >
              <ExpoImage
                source={`sf:${item.icon}`}
                tintColor={t.foreground}
                style={{ width: 18, height: 18 }}
              />
              <Text className="text-sm text-foreground">{item.label}</Text>
            </DropdownMenuItem>
          ))}
        </DropdownMenuContent>
      </DropdownMenu>
    </View>
  );
}

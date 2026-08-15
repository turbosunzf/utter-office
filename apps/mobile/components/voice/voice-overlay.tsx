/**
 * VoiceOverlay — the two full-screen layers owned by the central record
 * button: the bottom sheet (short tap) and the recording ripple overlay
 * (long hold). Rendered as a sibling of <Tabs> in (tabs)/_layout.tsx so
 * both stack above the tab bar.
 *
 * - Sheet: <Modal transparent> so its backdrop captures touches (dismiss on
 *   backdrop press) and the slide animation runs both in and out.
 * - Recording overlay: NOT a Modal — an absolute View with
 *   pointerEvents="none" so the finger stays on the record button beneath
 *   it; it only paints the ripple + timer (spec §3).
 */
import { useEffect, useRef, useState } from "react";
import {
  Animated,
  Easing,
  Modal,
  Pressable,
  StyleSheet,
  View,
} from "react-native";
import { Image } from "expo-image";
import { router } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Text } from "@/components/ui/text";
import { useWorkspaceStore } from "@/data/workspace-store";
import { useVoiceStore } from "@/data/stores/voice-store";
import { useColorScheme } from "@/lib/use-color-scheme";
import { THEME } from "@/lib/theme";

interface VoiceSheetItem {
  label: string;
  /** SF Symbol name, rendered via expo-image `source: "sf:<name>"`. */
  icon: string;
  /** Path under /:slug/ — final href is `/${slug}${path}`. */
  path: string;
}

// Matches the old voice-tab-dropdown's three entry points (spec §4.1).
const SHEET_ITEMS: VoiceSheetItem[] = [
  { label: "录音", icon: "mic", path: "/voice-record" },
  { label: "翻译", icon: "character.bubble", path: "/voice-translate" },
  { label: "发送语音", icon: "waveform", path: "/voice-talk" },
];

// 3 concentric ripples staggered 400ms apart (spec §3: 1600ms cycle).
const RIPPLE_COUNT = 3;

export function VoiceOverlay() {
  const sheetOpen = useVoiceStore((s) => s.sheetOpen);
  const recording = useVoiceStore((s) => s.recording);

  return (
    <>
      <VoiceSheet visible={sheetOpen} />
      {recording ? <RecordingOverlay /> : null}
    </>
  );
}

/**
 * Bottom sheet opened by a short tap. iOS-settings-style: grabber, three
 * tappable rows, backdrop dismiss. Kept mounted so the slide-down animation
 * plays on dismiss rather than unmounting instantly.
 */
function VoiceSheet({ visible }: { visible: boolean }) {
  const insets = useSafeAreaInsets();
  const slug = useWorkspaceStore((s) => s.currentWorkspaceSlug);
  const closeSheet = useVoiceStore((s) => s.closeSheet);
  const { colorScheme } = useColorScheme();
  const t = THEME[colorScheme];

  const onPressItem = (path: string) => {
    closeSheet();
    if (slug) router.push(`/${slug}${path}`);
  };

  return (
    <Modal
      transparent
      visible={visible}
      animationType="slide"
      onRequestClose={closeSheet}
      statusBarTranslucent
    >
      <View style={styles.sheetRoot}>
        <Pressable
          style={StyleSheet.absoluteFill}
          onPress={closeSheet}
          accessibilityLabel="关闭"
        />
        <View
          style={[
            styles.sheetBody,
            {
              backgroundColor: t.card,
              paddingBottom: insets.bottom + 12,
            },
          ]}
        >
          <View style={[styles.grabber, { backgroundColor: t.border }]} />
          {SHEET_ITEMS.map((item) => (
            <Pressable
              key={item.path}
              onPress={() => onPressItem(item.path)}
              accessibilityLabel={item.label}
              className="flex-row items-center gap-3 h-14 rounded-xl px-3 active:bg-secondary"
            >
              <Image
                source={`sf:${item.icon}`}
                tintColor={t.foreground}
                style={{ width: 22, height: 22 }}
              />
              <Text className="text-base text-foreground">{item.label}</Text>
            </Pressable>
          ))}
        </View>
      </View>
    </Modal>
  );
}

/**
 * Full-screen recording overlay shown during a long hold. Pure paint —
 * pointerEvents="none" so the finger stays on the record button and the
 * pressOut that ends recording still fires. Ripples radiate from the button
 * position (bottom-centre); the timer ticks up top-centre.
 */
function RecordingOverlay() {
  const insets = useSafeAreaInsets();
  const { colorScheme } = useColorScheme();
  const t = THEME[colorScheme];

  const [seconds, setSeconds] = useState(0);
  const ripples = useRef<Animated.Value[]>(
    Array.from({ length: RIPPLE_COUNT }, () => new Animated.Value(0)),
  ).current;

  useEffect(() => {
    const id = setInterval(() => setSeconds((s) => s + 1), 1000);
    const loops = ripples.map((v) =>
      Animated.loop(
        Animated.timing(v, {
          toValue: 1,
          duration: 1600,
          easing: Easing.out(Easing.ease),
          useNativeDriver: true,
        }),
      ),
    );
    const composite = Animated.stagger(400, loops);
    composite.start();
    return () => {
      clearInterval(id);
      composite.stop();
    };
  }, [ripples]);

  const minutes = Math.floor(seconds / 60);
  const time = `${minutes}:${String(seconds % 60).padStart(2, "0")}`;

  return (
    <View pointerEvents="none" style={styles.recordingRoot}>
      <View style={{ alignItems: "center", paddingTop: insets.top + 24 }}>
        <Text style={[styles.timer, { color: "#FFFFFF" }]}>{time}</Text>
      </View>

      <View
        style={{
          position: "absolute",
          alignSelf: "center",
          bottom: insets.bottom + 60,
          width: 120,
          height: 120,
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        {ripples.map((v, i) => (
          <Animated.View
            key={i}
            style={[
              styles.ripple,
              {
                borderColor: t.brand,
                opacity: v.interpolate({
                  inputRange: [0, 1],
                  outputRange: [1, 0],
                }),
                transform: [
                  {
                    scale: v.interpolate({
                      inputRange: [0, 1],
                      outputRange: [0.7, 1.4],
                    }),
                  },
                ],
              },
            ]}
          />
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  sheetRoot: {
    flex: 1,
    justifyContent: "flex-end",
    backgroundColor: "rgba(0,0,0,0.4)",
  },
  sheetBody: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: 16,
    paddingTop: 8,
  },
  grabber: {
    width: 36,
    height: 4,
    borderRadius: 2,
    alignSelf: "center",
    marginBottom: 8,
  },
  recordingRoot: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0,0,0,0.55)",
  },
  timer: {
    fontSize: 28,
    fontWeight: "500",
    fontVariant: ["tabular-nums"],
  },
  ripple: {
    position: "absolute",
    width: 120,
    height: 120,
    borderRadius: 60,
    borderWidth: 2,
  },
});

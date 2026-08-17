/**
 * VoiceOverlay — the two full-screen layers owned by the central record
 * button: the action sheet (short tap) and the WeChat-style recording
 * overlay (long hold). Rendered as a sibling of <Tabs> in (tabs)/_layout.tsx
 * so both stack above the tab bar.
 *
 * - Sheet: <Modal transparent> so its backdrop captures touches (dismiss on
 *   backdrop press). The backdrop FADES in while only the sheet body SLIDES
 *   up (animationType="none" + Animated) — a plain `animationType="slide"`
 *   slides the whole modal including the backdrop, which reads wrong.
 * - Recording overlay: NOT a Modal — an absolute View with
 *   pointerEvents="none" so the finger stays on the record button beneath
 *   it; it only paints the waveform + timer + cancel-zone state (spec §3).
 */
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
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
import { useQuery } from "@tanstack/react-query";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Text } from "@/components/ui/text";
import { useWorkspaceStore } from "@/data/workspace-store";
import { useVoiceStore } from "@/data/stores/voice-store";
import { agentListOptions } from "@/data/queries/agents";
import { useColorScheme } from "@/lib/use-color-scheme";
import { THEME } from "@/lib/theme";

interface VoiceSheetItem {
  label: string;
  /** SF Symbol name, rendered via expo-image `source: "sf:<name>"`. */
  icon: string;
  /** Path under /:slug/ — final href is `/${slug}${path}`. */
  path: string;
  /** Prototype badge for MVP-only entries (录音 / 翻译). */
  prototype?: boolean;
}

// Matches the old voice-tab-dropdown's three entry points (spec §4.1).
const SHEET_ITEMS: VoiceSheetItem[] = [
  { label: "录音", icon: "mic", path: "/voice-record", prototype: true },
  {
    label: "翻译",
    icon: "character.bubble",
    path: "/voice-translate",
    prototype: true,
  },
  { label: "发送语音", icon: "waveform", path: "/voice-talk" },
];

// Waveform bars staggered 150ms apart (same EQ pattern as the button).
const WAVE_BAR_COUNT = 5;

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
 * Action sheet opened by a short tap. Backdrop fades in, the sheet body
 * slides up independently (RN Modal has no exit animation — the local `show`
 * state keeps it mounted while the reverse animation plays, then unmounts).
 */
function VoiceSheet({ visible }: { visible: boolean }) {
  const insets = useSafeAreaInsets();
  const slug = useWorkspaceStore((s) => s.currentWorkspaceSlug);
  const closeSheet = useVoiceStore((s) => s.closeSheet);
  const { colorScheme } = useColorScheme();
  const t = THEME[colorScheme];

  const [show, setShow] = useState(false);
  const [sheetHeight, setSheetHeight] = useState(0);
  const dismissing = useRef(false);
  const entered = useRef(false);
  const backdropOpacity = useRef(new Animated.Value(0)).current;
  const sheetTranslateY = useRef(new Animated.Value(0)).current;

  // On open: mount the modal hidden, then animate in once the sheet height is
  // known (onLayout) so translateY starts from the real height, not a guess.
  useEffect(() => {
    if (visible) {
      dismissing.current = false;
      entered.current = false;
      backdropOpacity.setValue(0);
      sheetTranslateY.setValue(600);
      setShow(true);
    }
  }, [visible, backdropOpacity, sheetTranslateY]);

  useEffect(() => {
    if (show && sheetHeight > 0 && !entered.current) {
      entered.current = true;
      sheetTranslateY.setValue(sheetHeight);
      Animated.parallel([
        Animated.timing(backdropOpacity, {
          toValue: 1,
          duration: 200,
          useNativeDriver: true,
        }),
        Animated.timing(sheetTranslateY, {
          toValue: 0,
          duration: 260,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: true,
        }),
      ]).start();
    }
  }, [show, sheetHeight, backdropOpacity, sheetTranslateY]);

  const requestClose = useCallback(() => {
    if (dismissing.current) return;
    dismissing.current = true;
    Animated.parallel([
      Animated.timing(backdropOpacity, {
        toValue: 0,
        duration: 180,
        useNativeDriver: true,
      }),
      Animated.timing(sheetTranslateY, {
        toValue: sheetHeight,
        duration: 220,
        easing: Easing.in(Easing.cubic),
        useNativeDriver: true,
      }),
    ]).start(() => {
      closeSheet();
      setShow(false);
    });
  }, [backdropOpacity, sheetTranslateY, sheetHeight, closeSheet]);

  const onPressItem = (path: string) => {
    dismissing.current = true;
    closeSheet();
    setShow(false);
    if (slug) router.push(`/${slug}${path}`);
  };

  return (
    <Modal
      transparent
      visible={show}
      animationType="none"
      onRequestClose={requestClose}
      statusBarTranslucent
    >
      <View style={styles.sheetRoot}>
        {/* Fading backdrop, behind the (transparent) dismiss Pressable. */}
        <Animated.View
          style={[
            StyleSheet.absoluteFill,
            { backgroundColor: "rgba(0,0,0,0.4)", opacity: backdropOpacity },
          ]}
        />
        <Pressable
          style={StyleSheet.absoluteFill}
          onPress={requestClose}
          accessibilityLabel="关闭"
        />
        {/* Sliding sheet body. */}
        <Animated.View
          onLayout={(e) => setSheetHeight(e.nativeEvent.layout.height)}
          style={[
            styles.sheetBody,
            {
              backgroundColor: t.card,
              paddingBottom: insets.bottom + 12,
              transform: [{ translateY: sheetTranslateY }],
            },
          ]}
        >
          <View style={[styles.grabber, { backgroundColor: t.border }]} />
          <Text className="py-1 text-center text-xs text-muted-foreground">
            语音助手
          </Text>
          {SHEET_ITEMS.map((item) => (
            <Pressable
              key={item.path}
              onPress={() => onPressItem(item.path)}
              accessibilityLabel={item.label}
              className="flex-row items-center gap-3 rounded-xl px-3 py-2.5 active:bg-secondary"
            >
              <View
                style={{
                  width: 36,
                  height: 36,
                  borderRadius: 10,
                  backgroundColor: t.secondary,
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <Image
                  source={`sf:${item.icon}`}
                  tintColor={t.foreground}
                  style={{ width: 20, height: 20 }}
                />
              </View>
              <Text className="flex-1 text-base text-foreground">
                {item.label}
              </Text>
              {item.prototype ? (
                <View className="rounded-md bg-secondary px-1.5 py-0.5">
                  <Text className="text-[10px] font-medium text-muted-foreground">
                    原型
                  </Text>
                </View>
              ) : null}
              <Image
                source="sf:chevron.right"
                tintColor={t.mutedForeground}
                style={{ width: 16, height: 16 }}
              />
            </Pressable>
          ))}
          <View className="h-2" />
          <Pressable
            onPress={requestClose}
            accessibilityLabel="取消"
            className="h-12 items-center justify-center rounded-xl active:opacity-70"
            style={{ backgroundColor: t.secondary }}
          >
            <Text className="text-base text-foreground">取消</Text>
          </Pressable>
        </Animated.View>
      </View>
    </Modal>
  );
}

/**
 * Full-screen recording overlay shown during a long hold. Pure paint —
 * pointerEvents="none" so the finger stays on the record button and the
 * pressOut that ends recording still fires (the Pan gesture already captured
 * the touch and keeps tracking it past the button edge — the slide-up cancel
 * depends on that).
 *
 * WeChat-style: dark backdrop fades in, a mic + waveform + timer in the
 * centre, "松开 发送" at the bottom. When the finger slides into the cancel
 * zone (`slidUp` from the store) the mic turns red with an X and the hints
 * flip to "松开手指，取消发送".
 *
 * M1: top line shows「将发送给 · {首个可用员工}」until M2 default-agent.
 */
function RecordingOverlay() {
  const insets = useSafeAreaInsets();
  const slidUp = useVoiceStore((s) => s.slidUp);
  const wsId = useWorkspaceStore((s) => s.currentWorkspaceId);
  const { data: agents = [] } = useQuery(agentListOptions(wsId));
  const targetAgent = useMemo(
    () => agents.find((a) => !a.archived_at) ?? null,
    [agents],
  );
  const { colorScheme } = useColorScheme();
  const t = THEME[colorScheme];

  const [seconds, setSeconds] = useState(0);
  const fade = useRef(new Animated.Value(0)).current;
  const waveBars = useRef<Animated.Value[]>(
    Array.from({ length: WAVE_BAR_COUNT }, () => new Animated.Value(0)),
  ).current;

  // Fade the whole layer in rather than popping it onto the screen.
  useEffect(() => {
    Animated.timing(fade, {
      toValue: 1,
      duration: 200,
      useNativeDriver: true,
    }).start();
  }, [fade]);

  useEffect(() => {
    const id = setInterval(() => setSeconds((s) => s + 1), 1000);
    const loops = waveBars.map((v) =>
      Animated.loop(
        Animated.sequence([
          Animated.timing(v, {
            toValue: 1,
            duration: 450,
            easing: Easing.inOut(Easing.sin),
            useNativeDriver: true,
          }),
          Animated.timing(v, {
            toValue: 0,
            duration: 450,
            easing: Easing.inOut(Easing.sin),
            useNativeDriver: true,
          }),
        ]),
      ),
    );
    const composite = Animated.stagger(150, loops);
    composite.start();
    return () => {
      clearInterval(id);
      composite.stop();
    };
  }, [waveBars]);

  const minutes = Math.floor(seconds / 60);
  const time = `${minutes}:${String(seconds % 60).padStart(2, "0")}`;

  return (
    <Animated.View
      pointerEvents="none"
      style={[styles.recordingRoot, { opacity: fade }]}
    >
      {/* Top hint — cancel affordance, else target agent name. */}
      <View style={[styles.recordingTop, { paddingTop: insets.top + 20 }]}>
        {slidUp ? (
          <View className="flex-row items-center gap-2">
            <View style={styles.cancelBadge}>
              <Image
                source="sf:xmark"
                tintColor="#FFFFFF"
                style={{ width: 14, height: 14 }}
              />
            </View>
            <Text style={styles.cancelText}>松开手指，取消发送</Text>
          </View>
        ) : (
          <View className="items-center gap-1">
            <Text style={styles.recordHint}>
              {targetAgent
                ? `将发送给 · ${targetAgent.name}`
                : "暂无可用数字员工"}
            </Text>
            <Text style={styles.recordHintSub}>手指上滑，取消发送</Text>
          </View>
        )}
      </View>

      {/* Centre: mic + waveform + timer. */}
      <View style={styles.recordingCenter}>
        <View
          style={[
            styles.micContainer,
            {
              backgroundColor: slidUp ? t.destructive : "rgba(255,255,255,0.16)",
            },
          ]}
        >
          <Image
            source={slidUp ? "sf:xmark" : "sf:mic.fill"}
            tintColor="#FFFFFF"
            style={{ width: 34, height: 34 }}
          />
        </View>
        <View style={styles.waveRow}>
          {waveBars.map((v, i) => (
            <Animated.View
              key={i}
              style={[
                styles.waveBar,
                {
                  transform: [
                    {
                      scaleY: v.interpolate({
                        inputRange: [0, 1],
                        outputRange: [0.3, 1],
                      }),
                    },
                  ],
                },
              ]}
            />
          ))}
        </View>
        <Text style={styles.timer}>{time}</Text>
      </View>

      {/* Bottom release hint. */}
      <View style={[styles.recordingBottom, { paddingBottom: insets.bottom + 40 }]}>
        <Text style={styles.recordHint}>
          {slidUp ? "松开手指，取消发送" : "松开 发送"}
        </Text>
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  sheetRoot: {
    flex: 1,
    justifyContent: "flex-end",
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
    marginBottom: 4,
  },
  recordingRoot: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0,0,0,0.55)",
  },
  recordingTop: {
    alignItems: "center",
  },
  recordHint: {
    color: "rgba(255,255,255,0.9)",
    fontSize: 15,
    fontWeight: "500",
  },
  recordHintSub: {
    color: "rgba(255,255,255,0.65)",
    fontSize: 13,
    fontWeight: "400",
  },
  cancelBadge: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: "rgba(239,68,68,0.9)",
    alignItems: "center",
    justifyContent: "center",
  },
  cancelText: {
    color: "#EF4444",
    fontSize: 15,
    fontWeight: "600",
  },
  recordingCenter: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 16,
  },
  micContainer: {
    width: 76,
    height: 76,
    borderRadius: 38,
    alignItems: "center",
    justifyContent: "center",
  },
  waveRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    height: 28,
  },
  waveBar: {
    width: 4,
    height: 28,
    borderRadius: 2,
    backgroundColor: "#FFFFFF",
    transformOrigin: "center",
  },
  timer: {
    color: "#FFFFFF",
    fontSize: 28,
    fontWeight: "500",
    fontVariant: ["tabular-nums"],
  },
  recordingBottom: {
    alignItems: "center",
  },
});

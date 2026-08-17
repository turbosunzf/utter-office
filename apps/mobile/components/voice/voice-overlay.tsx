/**
 * VoiceOverlay — the two full-screen layers owned by the central record
 * button: the action sheet (short tap) and the WeChat-style recording
 * overlay (long hold). Rendered as a sibling of <Tabs> in (tabs)/_layout.tsx
 * so the sheet Modal stacks above the bar; the recording layer is portaled
 * to the root PortalHost (FullWindowOverlay on iOS) so it paints above
 * react-native-screens native layers — otherwise the “speaking” UI is
 * invisible under the tab navigator.
 *
 * - Sheet: <Modal transparent> so its backdrop captures touches (dismiss on
 *   backdrop press). The backdrop FADES in while only the sheet body SLIDES
 *   up (animationType="none" + Animated) — a plain `animationType="slide"`
 *   slides the whole modal including the backdrop, which reads wrong.
 * - Recording overlay: NOT a Modal — Portal + pointerEvents="none" so the
 *   finger stays on the record button beneath it. Half-screen frosted panel
 *   slides up over a light dim (waveform + ripples + cancel zone).
 */
import { useCallback, useEffect, useRef, useState } from "react";
import {
  Animated,
  Easing,
  Modal,
  Pressable,
  StyleSheet,
  View,
} from "react-native";
import { Icon, type AppIconName } from "@/components/ui/icon";
import { Portal } from "@rn-primitives/portal";
import { router } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Text } from "@/components/ui/text";
import { useWorkspaceStore } from "@/data/workspace-store";
import { useVoiceStore } from "@/data/stores/voice-store";
import { useColorScheme } from "@/lib/use-color-scheme";
import { THEME } from "@/lib/theme";

const WAVE_BAR_COUNT = 5;
const RIPPLE_COUNT = 3;
const TOAST_MS = 2200;

export function VoiceOverlay() {
  const sheetOpen = useVoiceStore((s) => s.sheetOpen);
  const recording = useVoiceStore((s) => s.recording);
  const toastMessage = useVoiceStore((s) => s.toastMessage);

  return (
    <>
      <VoiceSheet visible={sheetOpen} />
      {recording ? (
        <Portal name="voice-recording">
          <RecordingOverlay />
        </Portal>
      ) : null}
      {toastMessage ? (
        <Portal name="voice-toast">
          <VoiceToast message={toastMessage} />
        </Portal>
      ) : null}
    </>
  );
}

function VoiceToast({ message }: { message: string }) {
  const insets = useSafeAreaInsets();
  const clearToast = useVoiceStore((s) => s.clearToast);
  const opacity = useRef(new Animated.Value(0)).current;
  const translateY = useRef(new Animated.Value(12)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(opacity, {
        toValue: 1,
        duration: 180,
        useNativeDriver: true,
      }),
      Animated.timing(translateY, {
        toValue: 0,
        duration: 180,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
    ]).start();

    const hide = setTimeout(() => {
      Animated.parallel([
        Animated.timing(opacity, {
          toValue: 0,
          duration: 200,
          useNativeDriver: true,
        }),
        Animated.timing(translateY, {
          toValue: 8,
          duration: 200,
          useNativeDriver: true,
        }),
      ]).start(() => clearToast());
    }, TOAST_MS);

    return () => clearTimeout(hide);
  }, [message, opacity, translateY, clearToast]);

  return (
    <View pointerEvents="none" style={styles.toastRoot}>
      <Animated.View
        style={[
          styles.toastPill,
          {
            marginBottom: Math.max(insets.bottom, 12) + 72,
            opacity,
            transform: [{ translateY }],
          },
        ]}
      >
        <Text style={styles.toastText}>{message}</Text>
      </Animated.View>
    </View>
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
    if (dismissing.current) return;
    dismissing.current = true;
    closeSheet();
    setShow(false);
    if (slug) router.push(`/${slug}${path}`);
  };

  const sheetItems: {
    label: string;
    hint: string;
    icon: AppIconName;
    path: string;
    accent: string;
    soft: string;
    prototype?: boolean;
  }[] = [
    {
      label: "录音",
      hint: "边录边转写",
      icon: "Mic",
      path: "/voice-record",
      accent: t.brand,
      soft: "rgba(59,111,255,0.12)",
      prototype: true,
    },
    {
      label: "翻译",
      hint: "实时双语",
      icon: "Languages",
      path: "/voice-translate",
      accent: "#0D9488",
      soft: "rgba(13,148,136,0.12)",
      prototype: true,
    },
    {
      label: "发语音",
      hint: "即时下达",
      icon: "AudioLines",
      path: "/voice-talk",
      accent: t.priority,
      soft: "rgba(245,158,11,0.14)",
    },
  ];

  return (
    <Modal
      transparent
      visible={show}
      animationType="none"
      onRequestClose={requestClose}
      statusBarTranslucent
    >
      <View style={styles.sheetRoot}>
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
          <Text className="pb-3 pt-1 text-center text-[13px] font-medium text-muted-foreground">
            选择语音方式
          </Text>
          <View className="flex-row gap-2.5 px-0.5">
            {sheetItems.map((item) => (
              <Pressable
                key={item.path}
                onPress={() => onPressItem(item.path)}
                accessibilityLabel={item.label}
                className="flex-1 overflow-hidden rounded-2xl active:opacity-85"
                style={{
                  borderWidth: 1,
                  borderColor: t.border,
                  backgroundColor:
                    colorScheme === "dark" ? t.secondary : "#F7F8FC",
                }}
              >
                <View className="items-center gap-2 px-2 py-4">
                  <View
                    className="size-12 items-center justify-center rounded-2xl"
                    style={{ backgroundColor: item.soft }}
                  >
                    <Icon
                      name={item.icon}
                      size={22}
                      color={item.accent}
                      strokeWidth={2.2}
                    />
                  </View>
                  <Text
                    className="text-[14px] font-bold text-foreground"
                    numberOfLines={1}
                  >
                    {item.label}
                  </Text>
                  <Text
                    className="text-[10px] text-muted-foreground"
                    numberOfLines={1}
                  >
                    {item.hint}
                  </Text>
                  {item.prototype ? (
                    <View className="rounded-md bg-secondary/80 px-1.5 py-0.5">
                      <Text className="text-[9px] font-medium text-muted-foreground">
                        原型
                      </Text>
                    </View>
                  ) : (
                    <View className="h-[18px]" />
                  )}
                </View>
              </Pressable>
            ))}
          </View>
          <View className="h-3" />
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
 * Half-screen speaking panel shown during a long hold. Pure paint —
 * pointerEvents="none" so the finger stays on the record button.
 *
 * Layout (WeChat-like):
 *   - light dim over the full screen (keeps the page visible underneath)
 *   - bottom ~48% frosted panel slides up with springy easing
 *   - mic + ripples + EQ live inside the panel
 */
function RecordingOverlay() {
  const insets = useSafeAreaInsets();
  const slidUp = useVoiceStore((s) => s.slidUp);
  const { colorScheme } = useColorScheme();
  const t = THEME[colorScheme];

  const dimOpacity = useRef(new Animated.Value(0)).current;
  const panelY = useRef(new Animated.Value(280)).current;
  const panelScale = useRef(new Animated.Value(0.96)).current;
  const waveBars = useRef<Animated.Value[]>(
    Array.from({ length: WAVE_BAR_COUNT }, () => new Animated.Value(0)),
  ).current;
  const ripples = useRef<Animated.Value[]>(
    Array.from({ length: RIPPLE_COUNT }, () => new Animated.Value(0)),
  ).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(dimOpacity, {
        toValue: 1,
        duration: 180,
        useNativeDriver: true,
      }),
      Animated.spring(panelY, {
        toValue: 0,
        damping: 18,
        stiffness: 220,
        mass: 0.9,
        useNativeDriver: true,
      }),
      Animated.spring(panelScale, {
        toValue: 1,
        damping: 16,
        stiffness: 240,
        mass: 0.85,
        useNativeDriver: true,
      }),
    ]).start();
  }, [dimOpacity, panelY, panelScale]);

  useEffect(() => {
    const waveLoops = waveBars.map((v) =>
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
    const rippleLoops = ripples.map((v) =>
      Animated.loop(
        Animated.timing(v, {
          toValue: 1,
          duration: 1400,
          easing: Easing.out(Easing.quad),
          useNativeDriver: true,
        }),
      ),
    );
    const waves = Animated.stagger(150, waveLoops);
    const rings = Animated.stagger(380, rippleLoops);
    waves.start();
    rings.start();
    return () => {
      waves.stop();
      rings.stop();
    };
  }, [waveBars, ripples]);

  const releaseHint = slidUp ? "松开手指，取消" : "松开结束";

  return (
    <View pointerEvents="none" style={styles.recordingRoot}>
      <Animated.View
        style={[styles.recordingDim, { opacity: dimOpacity }]}
      />

      <Animated.View
        style={[
          styles.recordingPanel,
          {
            paddingBottom: Math.max(insets.bottom, 16) + 20,
            backgroundColor: slidUp
              ? "rgba(80, 16, 16, 0.82)"
              : "rgba(28, 36, 64, 0.78)",
            transform: [{ translateY: panelY }, { scale: panelScale }],
          },
        ]}
      >
        <View style={styles.panelGrabber} />

        <View style={styles.panelHeader}>
          {slidUp ? (
            <View className="flex-row items-center gap-2">
              <View style={styles.cancelBadge}>
                <Icon name="X" size={22} color={t.foreground} />
              </View>
              <Text style={styles.cancelText}>松开手指，取消</Text>
            </View>
          ) : (
            <View className="items-center gap-1">
              <Text style={styles.recordHint}>正在说话（原型演示）</Text>
              <Text style={styles.recordHintSub}>手指上滑可取消</Text>
            </View>
          )}
        </View>

        <View style={styles.recordingCenter}>
          <View style={styles.rippleStage}>
            {ripples.map((v, i) => (
              <Animated.View
                key={i}
                style={[
                  styles.ripple,
                  {
                    borderColor: slidUp
                      ? "rgba(255,120,120,0.45)"
                      : "rgba(255,255,255,0.35)",
                    opacity: v.interpolate({
                      inputRange: [0, 1],
                      outputRange: [0.5, 0],
                    }),
                    transform: [
                      {
                        scale: v.interpolate({
                          inputRange: [0, 1],
                          outputRange: [0.75, 1.35],
                        }),
                      },
                    ],
                  },
                ]}
              />
            ))}
            <View
              style={[
                styles.micContainer,
                {
                  backgroundColor: slidUp
                    ? t.destructive
                    : "rgba(255,255,255,0.14)",
                  borderColor: slidUp
                    ? "rgba(255,255,255,0.35)"
                    : "rgba(255,255,255,0.55)",
                },
              ]}
            >
              <Icon name={slidUp ? "X" : "Mic"} size={28} color="#FFFFFF" />
            </View>
          </View>

          <View style={styles.waveRow}>
            {waveBars.map((v, i) => (
              <Animated.View
                key={i}
                style={[
                  styles.waveBar,
                  {
                    backgroundColor: slidUp
                      ? "rgba(255,170,170,0.95)"
                      : "#FFFFFF",
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
        </View>

        <View style={styles.recordingBottom}>
          <Text style={styles.recordHint}>{releaseHint}</Text>
        </View>
      </Animated.View>
    </View>
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
    zIndex: 9999,
    elevation: 9999,
    justifyContent: "flex-end",
  },
  recordingDim: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0,0,0,0.28)",
  },
  recordingPanel: {
    height: "48%",
    minHeight: 320,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    borderCurve: "continuous",
    paddingHorizontal: 20,
    paddingTop: 10,
    overflow: "hidden",
    // Soft glass edge
    borderTopWidth: StyleSheet.hairlineWidth,
    borderColor: "rgba(255,255,255,0.22)",
  },
  panelGrabber: {
    width: 36,
    height: 4,
    borderRadius: 2,
    alignSelf: "center",
    backgroundColor: "rgba(255,255,255,0.35)",
    marginBottom: 12,
  },
  panelHeader: {
    alignItems: "center",
    minHeight: 44,
    justifyContent: "center",
  },
  recordHint: {
    color: "rgba(255,255,255,0.92)",
    fontSize: 15,
    fontWeight: "500",
  },
  recordHintSub: {
    color: "rgba(255,255,255,0.62)",
    fontSize: 13,
    fontWeight: "400",
    marginTop: 4,
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
    color: "#FF8E8E",
    fontSize: 15,
    fontWeight: "600",
  },
  recordingCenter: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 14,
  },
  rippleStage: {
    width: 180,
    height: 180,
    alignItems: "center",
    justifyContent: "center",
  },
  ripple: {
    position: "absolute",
    width: 120,
    height: 120,
    borderRadius: 60,
    borderWidth: 1.5,
  },
  micContainer: {
    width: 84,
    height: 84,
    borderRadius: 42,
    borderWidth: 2,
    alignItems: "center",
    justifyContent: "center",
  },
  waveRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    height: 26,
  },
  waveBar: {
    width: 4,
    height: 26,
    borderRadius: 2,
    transformOrigin: "center",
  },
  recordingBottom: {
    alignItems: "center",
    paddingTop: 4,
  },
  toastRoot: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 10000,
    elevation: 10000,
    justifyContent: "flex-end",
    alignItems: "center",
  },
  toastPill: {
    maxWidth: "86%",
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 10,
    backgroundColor: "rgba(28, 36, 64, 0.92)",
  },
  toastText: {
    color: "#FFFFFF",
    fontSize: 13,
    fontWeight: "500",
    textAlign: "center",
  },
});

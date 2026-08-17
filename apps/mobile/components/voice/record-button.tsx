/**
 * RecordButton — the central Voice tab button, rendered as the Voice tab's
 * custom `tabBarButton` (spec §1 option A). It is NOT a navigation target:
 * the tab's `listeners.tabPress` preventDefault()s and this button owns the
 * whole interaction, exactly like the old tab-as-action dropdowns.
 *
 * State machine — a single `Gesture.Pan` splits tap / hold / slide-up-cancel
 * (WeChat 发语音 style):
 *   touch down → scale 1→0.92, start the 2s timer
 *   <2s release  → open the bottom sheet (录音/翻译/发送语音)
 *   ≥2s          → haptic + enter RECORDING (mic → 4-bar EQ + full-screen
 *                   overlay in VoiceOverlay)
 *   slide up ≥80px while recording → arm the cancel zone (store `slidUp`,
 *                   overlay flips red); release in the zone → cancel (no send)
 *   release (recording, not slid up) → haptic + send "你好" + switch to Chat
 *
 * Gesture identity stays stable across the mid-press `setRecording` re-render
 * (useMemo + refs): recreating the Pan while a press is active would tear
 * down the native handler and lose the release. `send` / `slug` are read via
 * refs so they don't leak into the memo deps. RNGH v2 workletizes gesture
 * callbacks by default under Reanimated — `.runOnJS(true)` forces JS-thread
 * execution because these callbacks touch zustand / Animated / Haptics /
 * router.
 */
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Animated, Easing, StyleSheet, View } from "react-native";
import { Gesture, GestureDetector } from "react-native-gesture-handler";
import { LinearGradient } from "expo-linear-gradient";
import { Image } from "expo-image";
import * as Haptics from "expo-haptics";
import { router } from "expo-router";
import { useWorkspaceStore } from "@/data/workspace-store";
import { useVoiceStore } from "@/data/stores/voice-store";
import { useSendVoiceMessage } from "@/lib/use-send-voice-message";

const LONG_PRESS_MS = 2000;
/** Upward travel (px) that arms the slide-up cancel zone. */
const CANCEL_THRESHOLD = -80;
const BUTTON_SIZE = 58;
const BUTTON_RADIUS = 18;

// 4 EQ bars staggered 150ms apart (spec §3: 900ms cycle, 150ms phase offset).
const EQ_BAR_COUNT = 4;

export function RecordButton() {
  const openSheet = useVoiceStore((s) => s.openSheet);
  const recording = useVoiceStore((s) => s.recording);
  const setRecording = useVoiceStore((s) => s.setRecording);
  const setSlidUp = useVoiceStore((s) => s.setSlidUp);
  const slug = useWorkspaceStore((s) => s.currentWorkspaceSlug);
  const { send, sending } = useSendVoiceMessage();

  const [pressed, setPressed] = useState(false);
  const scale = useRef(new Animated.Value(1)).current;
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const recordingRef = useRef(false);
  const slidUpRef = useRef(false);

  // Values that change per render but must stay fresh inside the stable
  // memoized gesture without recreating it.
  const sendRef = useRef(send);
  sendRef.current = send;
  const slugRef = useRef(slug);
  slugRef.current = slug;

  // EQ bars — Animated.loop + Animated.stagger (scaleY → native driver).
  const eqBars = useRef<Animated.Value[]>(
    Array.from({ length: EQ_BAR_COUNT }, () => new Animated.Value(0)),
  ).current;

  useEffect(() => {
    if (!recording) {
      eqBars.forEach((v) => v.setValue(0));
      return;
    }
    const loops = eqBars.map((v) =>
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
    return () => composite.stop();
  }, [recording, eqBars]);

  const animateScale = useCallback(
    (toValue: number) => {
      Animated.timing(scale, {
        toValue,
        duration: 120,
        easing: Easing.out(Easing.ease),
        useNativeDriver: true,
      }).start();
    },
    [scale],
  );

  const pan = useMemo(
    () =>
      Gesture.Pan()
        .runOnJS(true)
        .minDistance(0)
        .maxPointers(1)
        .hitSlop(8)
        .shouldCancelWhenOutside(false)
        .enabled(!sending)
        .onBegin(() => {
          // Defensive re-press guard — you can't start a second press without
          // lifting, but a system quirk shouldn't restart the timer mid-record.
          if (recordingRef.current) return;
          setPressed(true);
          animateScale(0.92);
          timer.current = setTimeout(() => {
            recordingRef.current = true;
            setRecording(true);
            void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
            timer.current = null;
          }, LONG_PRESS_MS);
        })
        .onUpdate((e) => {
          const slidUp = e.translationY < CANCEL_THRESHOLD;
          // Write to the store only on threshold crossing — the overlay is a
          // sibling subscribed to it; per-pixel writes would re-render it at
          // frame rate. One haptic on the rising edge.
          if (slidUp !== slidUpRef.current) {
            slidUpRef.current = slidUp;
            setSlidUp(slidUp);
            if (slidUp) {
              void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Rigid);
            }
          }
        })
        .onEnd((e) => {
          if (timer.current) {
            clearTimeout(timer.current);
            timer.current = null;
          }
          const wasRecording = recordingRef.current;
          recordingRef.current = false;
          setPressed(false);
          animateScale(1);

          if (!wasRecording) {
            // Short tap (<2s) — open the voice sheet. A <2s release with some
            // upward drift is still a tap, never a cancel.
            openSheet();
            return;
          }

          setRecording(false);
          const slidUp = e.translationY < CANCEL_THRESHOLD;
          if (slidUp) {
            // Cancelled — no send, no navigation.
            void Haptics.notificationAsync(
              Haptics.NotificationFeedbackType.Warning,
            );
            return;
          }
          void Haptics.notificationAsync(
            Haptics.NotificationFeedbackType.Success,
          );
          void sendRef.current("你好");
          if (slugRef.current) router.navigate(`/${slugRef.current}/chat`);
        })
        .onFinalize(() => {
          // Cleanup also fires on CANCELLED (system interruption, background,
          // incoming call) — without it the 2s timer and a stuck red slidUp
          // leak. Redundant with onEnd on a clean end; harmless.
          if (timer.current) {
            clearTimeout(timer.current);
            timer.current = null;
          }
          setPressed(false);
          animateScale(1);
          recordingRef.current = false;
          slidUpRef.current = false;
          setSlidUp(false);
        }),
    [animateScale, openSheet, setRecording, setSlidUp, sending],
  );

  return (
    <View style={styles.cell}>
      <GestureDetector gesture={pan}>
        <Animated.View
          accessible
          accessibilityRole="button"
          accessibilityLabel="录音"
          accessibilityHint="轻点选择录音、翻译或发送语音，长按 2 秒直接发送语音，上滑取消"
          style={[styles.shadow, { transform: [{ scale }] }]}
        >
          <LinearGradient
            colors={["#2F62F0", "#3B6FFF", "#5B8AFF"]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.button}
          >
            {recording ? (
              <View style={styles.eqContainer}>
                {eqBars.map((v, i) => (
                  <Animated.View
                    key={i}
                    style={[
                      styles.eqBar,
                      {
                        transform: [
                          {
                            scaleY: v.interpolate({
                              inputRange: [0, 1],
                              outputRange: [0.33, 1],
                            }),
                          },
                        ],
                      },
                    ]}
                  />
                ))}
              </View>
            ) : (
              <Image
                source="sf:mic.fill"
                tintColor="#FFFFFF"
                style={styles.mic}
              />
            )}
            {pressed ? <View style={styles.pressedScrim} /> : null}
          </LinearGradient>
        </Animated.View>
      </GestureDetector>
    </View>
  );
}

const styles = StyleSheet.create({
  cell: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  shadow: {
    borderRadius: BUTTON_RADIUS,
    shadowColor: "rgb(59,111,255)",
    shadowOpacity: 0.35,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 6 },
    elevation: 6,
  },
  button: {
    width: BUTTON_SIZE,
    height: BUTTON_SIZE,
    borderRadius: BUTTON_RADIUS,
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
  },
  mic: {
    width: 26,
    height: 26,
  },
  eqContainer: {
    flexDirection: "row",
    alignItems: "flex-end",
    gap: 3,
    height: 24,
  },
  eqBar: {
    width: 3,
    height: 24,
    borderRadius: 1.5,
    backgroundColor: "#FFFFFF",
    transformOrigin: "bottom",
  },
  pressedScrim: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0,0,0,0.10)",
  },
});

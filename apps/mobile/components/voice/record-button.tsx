/**
 * RecordButton — the central Voice tab button, rendered as the Voice tab's
 * custom `tabBarButton` (spec §1 option A). It is NOT a navigation target:
 * the tab's `listeners.tabPress` preventDefault()s and this button owns the
 * whole interaction, exactly like the old tab-as-action dropdowns.
 *
 * State machine (spec §2) — one 2s threshold splits tap from hold:
 *   pressIn  → scale 1→0.92, start the 2s timer
 *   <2s      → release: open the bottom sheet (录音/翻译/发送语音)
 *   ≥2s      → timer fires: haptic + enter RECORDING (mic → 4-bar EQ)
 *   release  → (was recording) haptic + send "你好" + switch to Chat tab
 *
 * Edge cases (spec §2 防误触): a slide-out while still holding does NOT
 * cancel (only a full release adjudicates); consecutive presses each reset
 * the timer; a re-press during recording is ignored.
 *
 * `longPressFiredRef` (not component state) drives the pressOut adjudication
 * because the handler must read the value captured when the finger landed —
 * component state would be a stale closure after setRecording re-renders the
 * button mid-press.
 */
import { useCallback, useEffect, useRef, useState } from "react";
import { Animated, Easing, Pressable, StyleSheet, View } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { Image } from "expo-image";
import * as Haptics from "expo-haptics";
import { router } from "expo-router";
import { useWorkspaceStore } from "@/data/workspace-store";
import { useVoiceStore } from "@/data/stores/voice-store";
import { useSendVoiceMessage } from "@/lib/use-send-voice-message";

const LONG_PRESS_MS = 2000;
const BUTTON_SIZE = 58;
const BUTTON_RADIUS = 18;

// 4 EQ bars staggered 150ms apart (spec §3: 900ms cycle, 150ms phase offset).
const EQ_BAR_COUNT = 4;

export function RecordButton() {
  const slug = useWorkspaceStore((s) => s.currentWorkspaceSlug);
  const openSheet = useVoiceStore((s) => s.openSheet);
  const recording = useVoiceStore((s) => s.recording);
  const setRecording = useVoiceStore((s) => s.setRecording);
  const { send, sending } = useSendVoiceMessage();

  const [pressed, setPressed] = useState(false);
  const scale = useRef(new Animated.Value(1)).current;
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const longPressFiredRef = useRef(false);
  const recordingRef = useRef(false);

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

  const onPressIn = useCallback(() => {
    if (recordingRef.current) return; // ignore re-press while recording
    longPressFiredRef.current = false;
    setPressed(true);
    animateScale(0.92);
    timer.current = setTimeout(() => {
      longPressFiredRef.current = true;
      recordingRef.current = true;
      setRecording(true);
      void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      timer.current = null;
    }, LONG_PRESS_MS);
  }, [animateScale, setRecording]);

  const onPressOut = useCallback(() => {
    if (timer.current) {
      clearTimeout(timer.current);
      timer.current = null;
    }

    setPressed(false);
    animateScale(1);

    if (longPressFiredRef.current) {
      // Ended a hold — finish recording, send to chat, switch to Chat tab.
      longPressFiredRef.current = false;
      recordingRef.current = false;
      setRecording(false);
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      void send("你好");
      if (slug) router.navigate(`/${slug}/chat`);
      return;
    }

    // Short tap — open the voice sheet.
    openSheet();
  }, [animateScale, openSheet, send, setRecording, slug]);

  return (
    <View style={styles.cell}>
      <Pressable
        onPressIn={onPressIn}
        onPressOut={onPressOut}
        disabled={sending}
        hitSlop={8}
        accessibilityRole="button"
        accessibilityLabel="录音"
        accessibilityHint="轻点选择录音、翻译或发送语音，长按 2 秒直接发送语音"
      >
        <Animated.View style={[styles.shadow, { transform: [{ scale }] }]}>
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
      </Pressable>
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

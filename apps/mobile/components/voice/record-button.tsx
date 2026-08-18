/**
 * RecordButton — central Voice tab action (not a navigation target).
 *
 * Touch model uses RN responders (not RNGH Pan) so the bottom tab bar
 * cannot cancel the gesture before onEnd — a common cause of “dead”
 * center buttons. Behavior matches WeChat 发语音:
 *   <holdMs release → voice sheet
 *   ≥holdMs       → recording overlay + EQ
 *   slide up ≥80px while recording → cancel zone; release → no toast
 *   release (recording, not cancelled) → prototype toast（不发送对话）
 */
import { useCallback, useEffect, useRef, useState } from "react";
import {
  Animated,
  Easing,
  StyleSheet,
  View,
  type GestureResponderEvent,
  type LayoutChangeEvent,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { Icon } from "@/components/ui/icon";
import * as Haptics from "expo-haptics";
import { useVoiceStore } from "@/data/stores/voice-store";
import { useAssistantStore } from "@/data/stores/assistant-store";
import { VOICE_PROTOTYPE_TOAST } from "@/data/mocks/voice";

const CANCEL_THRESHOLD = -80;
/** Meet Think 栏内录音键：宽大于高，不凸出底栏 */
const BUTTON_WIDTH = 64;
const BUTTON_HEIGHT = 46;
const BUTTON_RADIUS = 16;
const EQ_BAR_COUNT = 4;

export function RecordButton() {
  const openSheet = useVoiceStore((s) => s.openSheet);
  const recording = useVoiceStore((s) => s.recording);
  const setRecording = useVoiceStore((s) => s.setRecording);
  const setSlidUp = useVoiceStore((s) => s.setSlidUp);
  const showToast = useVoiceStore((s) => s.showToast);
  const holdMs = useAssistantStore((s) => s.holdThresholdMs);

  const [pressed, setPressed] = useState(false);
  const scale = useRef(new Animated.Value(1)).current;
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const recordingRef = useRef(false);
  const slidUpRef = useRef(false);
  const startPageY = useRef(0);
  const activeRef = useRef(false);

  const holdMsRef = useRef(holdMs);
  holdMsRef.current = holdMs;
  const openSheetRef = useRef(openSheet);
  openSheetRef.current = openSheet;
  const setRecordingRef = useRef(setRecording);
  setRecordingRef.current = setRecording;
  const setSlidUpRef = useRef(setSlidUp);
  setSlidUpRef.current = setSlidUp;
  const showToastRef = useRef(showToast);
  showToastRef.current = showToast;

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

  const clearTimer = useCallback(() => {
    if (timer.current) {
      clearTimeout(timer.current);
      timer.current = null;
    }
  }, []);

  const onGrant = useCallback(
    (e: GestureResponderEvent) => {
      if (activeRef.current) return;
      activeRef.current = true;
      recordingRef.current = false;
      slidUpRef.current = false;
      setSlidUpRef.current(false);
      startPageY.current = e.nativeEvent.pageY;
      setPressed(true);
      animateScale(0.92);
      clearTimer();
      timer.current = setTimeout(() => {
        recordingRef.current = true;
        setRecordingRef.current(true);
        void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
        timer.current = null;
      }, holdMsRef.current);
    },
    [animateScale, clearTimer],
  );

  const onMove = useCallback((e: GestureResponderEvent) => {
    if (!activeRef.current || !recordingRef.current) return;
    const dy = e.nativeEvent.pageY - startPageY.current;
    const slidUp = dy < CANCEL_THRESHOLD;
    if (slidUp !== slidUpRef.current) {
      slidUpRef.current = slidUp;
      setSlidUpRef.current(slidUp);
      if (slidUp) {
        void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Rigid);
      }
    }
  }, []);

  const finish = useCallback(
    (cancelledBySystem: boolean) => {
      if (!activeRef.current) return;
      activeRef.current = false;
      clearTimer();
      setPressed(false);
      animateScale(1);

      const wasRecording = recordingRef.current;
      const slidUp = slidUpRef.current;
      recordingRef.current = false;
      slidUpRef.current = false;
      setSlidUpRef.current(false);

      if (cancelledBySystem) {
        if (wasRecording) setRecordingRef.current(false);
        return;
      }

      if (!wasRecording) {
        openSheetRef.current();
        return;
      }

      setRecordingRef.current(false);
      if (slidUp) {
        void Haptics.notificationAsync(
          Haptics.NotificationFeedbackType.Warning,
        );
        return;
      }
      void Haptics.notificationAsync(
        Haptics.NotificationFeedbackType.Success,
      );
      // Prototype: never send to chat — toast only.
      showToastRef.current(VOICE_PROTOTYPE_TOAST);
    },
    [animateScale, clearTimer],
  );

  const onLayout = useCallback((_e: LayoutChangeEvent) => {}, []);

  return (
    <View
      style={styles.cell}
      onLayout={onLayout}
      collapsable={false}
      onStartShouldSetResponderCapture={() => true}
      onStartShouldSetResponder={() => true}
      onMoveShouldSetResponder={() => true}
      onResponderTerminationRequest={() => false}
      onResponderGrant={onGrant}
      onResponderMove={onMove}
      onResponderRelease={() => finish(false)}
      onResponderTerminate={() => finish(true)}
      accessible
      accessibilityRole="button"
      accessibilityLabel="录音"
      accessibilityHint="轻点选择录音、翻译或发语音，长按进入说话状态，上滑取消"
    >
      <Animated.View style={[styles.shadow, { transform: [{ scale }] }]}>
        <LinearGradient
          colors={["#3B6FFF", "#6B9BFF"]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.button}
          pointerEvents="none"
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
            <Icon name="Mic" size={28} color="#FFFFFF" strokeWidth={2.2} />
          )}
          {pressed ? <View style={styles.pressedScrim} /> : null}
        </LinearGradient>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  cell: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "transparent",
  },
  shadow: {
    borderRadius: BUTTON_RADIUS,
    shadowColor: "#3B6FFF",
    shadowOpacity: 0.28,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
    elevation: 3,
  },
  button: {
    width: BUTTON_WIDTH,
    height: BUTTON_HEIGHT,
    borderRadius: BUTTON_RADIUS,
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
  },
  eqContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: 3.5,
    height: 24,
  },
  eqBar: {
    width: 3.5,
    height: 24,
    borderRadius: 99,
    backgroundColor: "#FFFFFF",
    transformOrigin: "center",
  },
  pressedScrim: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0,0,0,0.10)",
  },
});

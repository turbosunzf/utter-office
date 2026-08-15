/**
 * voice-talk — 「长按发语音」page（meet-think 结构，纯 UI 交互）。
 *
 * Hold the mic ≥2s to enter the recording state (haptic + EQ animation);
 * release ends recording, sends a hard-coded "你好" to the current chat via
 * `useSendVoiceMessage`, then switches to the Chat tab. A short (<2s) press
 * is a no-op — the on-screen hint tells the user to hold. Real voice capture
 * / ASR / audio message protocol are out of scope (follow-up issues); this
 * screen proves the push-to-talk interaction + the chat send channel.
 *
 * The 2s-threshold state machine mirrors the central RecordButton
 * (components/voice/record-button.tsx): a `longPressFiredRef` (not component
 * state) drives the pressOut adjudication because the handler must read the
 * value captured when the finger landed — component state would be a stale
 * closure after `setRecording` re-renders the button mid-press.
 */
import { useCallback, useEffect, useRef, useState } from "react";
import { Animated, Easing, Pressable, StyleSheet, View } from "react-native";
import { Image } from "expo-image";
import * as Haptics from "expo-haptics";
import { router } from "expo-router";
import { Text } from "@/components/ui/text";
import { useWorkspaceStore } from "@/data/workspace-store";
import { useSendVoiceMessage } from "@/lib/use-send-voice-message";
import { useColorScheme } from "@/lib/use-color-scheme";
import { THEME } from "@/lib/theme";

const LONG_PRESS_MS = 2000;
const EQ_BAR_COUNT = 4;

export default function VoiceTalkPage() {
  const slug = useWorkspaceStore((s) => s.currentWorkspaceSlug);
  const { send, sending } = useSendVoiceMessage();
  const { colorScheme } = useColorScheme();
  const t = THEME[colorScheme];

  const [recording, setRecording] = useState(false);
  const [pressed, setPressed] = useState(false);

  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const longPressFiredRef = useRef(false);
  const recordingRef = useRef(false);

  // EQ bars — Animated.loop + Animated.stagger (scaleY → native driver),
  // same 900ms cycle / 150ms phase offset as the central RecordButton.
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

  const onPressIn = useCallback(() => {
    if (recordingRef.current) return; // ignore re-press while recording
    longPressFiredRef.current = false;
    setPressed(true);
    timer.current = setTimeout(() => {
      longPressFiredRef.current = true;
      recordingRef.current = true;
      setRecording(true);
      void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      timer.current = null;
    }, LONG_PRESS_MS);
  }, []);

  const onPressOut = useCallback(() => {
    if (timer.current) {
      clearTimeout(timer.current);
      timer.current = null;
    }

    setPressed(false);

    if (longPressFiredRef.current) {
      // Ended a ≥2s hold — finish recording, send to chat, switch to Chat tab.
      longPressFiredRef.current = false;
      recordingRef.current = false;
      setRecording(false);
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      void send("你好");
      if (slug) router.navigate(`/${slug}/chat`);
      return;
    }
    // Short press — no send; the hint below tells the user to hold ≥2s.
  }, [send, slug]);

  const micTint = recording ? "#FFFFFF" : t.foreground;

  return (
    <View className="flex-1 bg-background items-center justify-center px-8">
      <Text className="text-sm text-muted-foreground mb-8 text-center">
        {recording
          ? "正在录音，松开结束并发送"
          : sending
            ? "发送中…"
            : "按住 2 秒说话，松开发送到当前聊天"}
      </Text>

      <Pressable
        onPressIn={onPressIn}
        onPressOut={onPressOut}
        disabled={sending}
        accessibilityLabel="长按说话"
        accessibilityHint="长按 2 秒进入录音，松开发送「你好」到当前聊天"
        style={{
          width: 160,
          height: 160,
          borderRadius: 80,
          alignItems: "center",
          justifyContent: "center",
          backgroundColor: recording ? t.brand : t.secondary,
          gap: 8,
          overflow: "hidden",
        }}
      >
        {recording ? (
          <View style={styles.eqRow}>
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
            tintColor={micTint}
            style={{ width: 40, height: 40 }}
          />
        )}
        {pressed && !recording ? <View style={styles.pressedScrim} /> : null}
      </Pressable>

      <Text className="mt-6 text-xs text-muted-foreground text-center">
        松开后自动切到「聊天」并发送「你好」
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  eqRow: {
    flexDirection: "row",
    alignItems: "flex-end",
    gap: 4,
    height: 40,
  },
  eqBar: {
    width: 5,
    height: 40,
    borderRadius: 2.5,
    backgroundColor: "#FFFFFF",
    transformOrigin: "bottom",
  },
  pressedScrim: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0,0,0,0.10)",
  },
});

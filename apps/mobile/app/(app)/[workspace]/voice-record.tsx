/**
 * 录音 page — meet-think 结构（纯 UI，无真实采集/ASR）。
 *
 * Reached from the central record button's bottom sheet (「录音」). Mirrors
 * the meet-think recording screen structure: a top capsule row (recording
 * status + display-mode + language), a live mock transcription list, and a
 * bottom Dock (waveform + timer + pause/stop orbs + tool row). No audio is
 * captured — the timer and transcript are simulated so the interaction can
 * be walked on device before real capture lands in a follow-up issue.
 *
 * The native Stack header (title「录音」+ back) is registered in
 * [workspace]/_layout.tsx; this body draws only the content below it.
 */
import { useEffect, useRef, useState } from "react";
import { Pressable, ScrollView, StyleSheet, View } from "react-native";
import { Icon, type AppIconName } from "@/components/ui/icon";
import { LinearGradient } from "expo-linear-gradient";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Text } from "@/components/ui/text";
import { VoicePrototypeBanner } from "@/components/voice/voice-prototype-banner";
import {
  VOICE_RECORD_POOL,
  VOICE_RECORD_SEED,
  type VoiceTranscriptLine,
} from "@/data/mocks/voice-record";
import { useColorScheme } from "@/lib/use-color-scheme";
import { THEME } from "@/lib/theme";

type TranscriptLine = VoiceTranscriptLine;

const TRANSCRIPT_SEED = VOICE_RECORD_SEED;
const TRANSCRIPT_POOL = VOICE_RECORD_POOL;

// How often a new mock line lands in the live transcript (seconds).
const APPEND_INTERVAL_S = 3;

/** MM:SS under an hour, HH:MM:SS from an hour — mirrors meet-think's clock. */
function formatClock(totalSeconds: number): string {
  const h = Math.floor(totalSeconds / 3600);
  const m = Math.floor((totalSeconds % 3600) / 60);
  const s = totalSeconds % 60;
  const ss = String(s).padStart(2, "0");
  if (h > 0) return `${h}:${String(m).padStart(2, "0")}:${ss}`;
  return `${m}:${ss}`;
}

export default function VoiceRecordPage() {
  const { colorScheme } = useColorScheme();
  const t = THEME[colorScheme];
  const insets = useSafeAreaInsets();

  const [elapsed, setElapsed] = useState(0);
  const [paused, setPaused] = useState(false);
  const [stopped, setStopped] = useState(false);
  const [lines, setLines] = useState<TranscriptLine[]>(TRANSCRIPT_SEED);

  const elapsedRef = useRef(0);
  const poolIndex = useRef(0);
  const scrollRef = useRef<ScrollView | null>(null);

  useEffect(() => {
    if (paused || stopped) return;
    const id = setInterval(() => {
      elapsedRef.current += 1;
      setElapsed(elapsedRef.current);
      if (elapsedRef.current % APPEND_INTERVAL_S === 0) {
        const next =
          TRANSCRIPT_POOL[poolIndex.current % TRANSCRIPT_POOL.length];
        poolIndex.current += 1;
        setLines((prev) => [
          ...prev,
          { ...next, time: formatClock(elapsedRef.current) },
        ]);
      }
    }, 1000);
    return () => clearInterval(id);
  }, [paused, stopped]);

  // Keep the newest line in view as the mock transcript grows.
  useEffect(() => {
    scrollRef.current?.scrollToEnd({ animated: true });
  }, [lines]);

  const onPauseResume = () => {
    if (stopped) {
      // Restart: reset the session and seed the transcript again.
      setStopped(false);
      setPaused(false);
      elapsedRef.current = 0;
      setElapsed(0);
      setLines(TRANSCRIPT_SEED);
      return;
    }
    setPaused((p) => !p);
  };

  const onStop = () => {
    setStopped(true);
    setPaused(false);
    elapsedRef.current = 0;
    setElapsed(0);
    setLines([]);
  };

  const status = stopped ? "已停止" : paused ? "已暂停" : "转写中";
  const dotColor = stopped ? t.mutedForeground : paused ? t.warning : t.brand;
  const showPlay = paused || stopped;

  return (
    <View className="flex-1 bg-background">
      <VoicePrototypeBanner />
      {/* 顶栏胶囊：状态 + 转写模式 + 语言 */}
      <View className="flex-row items-center gap-2 px-4 pt-2 pb-3">
        <Capsule label={status} dotColor={dotColor} />
        <Capsule label="逐句" />
        <Capsule label="中文→英文" />
      </View>

      {/* 实时转写列表 */}
      <ScrollView
        ref={scrollRef}
        className="flex-1"
        contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 16 }}
      >
        {lines.length === 0 ? (
          <View className="py-24 items-center gap-2">
            <Text className="text-sm text-muted-foreground">录音已结束</Text>
            <Text className="text-xs text-muted-foreground">
              点击底部播放按钮重新开始
            </Text>
          </View>
        ) : (
          lines.map((line, i) => (
            <View key={`${line.time}-${i}`} className="mb-4">
              <View
                className="self-start rounded-full px-2 py-0.5"
                style={{ backgroundColor: t.secondary }}
              >
                <Text className="text-xs text-muted-foreground">
                  {line.speaker} · {line.time}
                </Text>
              </View>
              <Text className="mt-1.5 text-base leading-6 text-foreground">
                {line.text}
              </Text>
              <Text className="mt-0.5 text-sm leading-5 text-muted-foreground">
                {line.translation}
              </Text>
            </View>
          ))
        )}
      </ScrollView>

      {/* 底部 Dock：波形 + 计时 + 暂停/停止圆钮 + 工具条 */}
      <View
        style={[
          styles.dock,
          {
            backgroundColor: t.card,
            borderTopColor: t.border,
            paddingBottom: insets.bottom + 8,
          },
        ]}
      >
        <View className="flex-row items-center gap-2 px-4 pt-3">
          <Icon name="AudioLines" size={22} color={t.brand} />
          <Text
            className="text-lg font-bold text-foreground"
            style={{ fontVariant: ["tabular-nums"] }}
          >
            {formatClock(elapsed)}
          </Text>
          <View className="flex-1" />
          <Pressable
            onPress={onPauseResume}
            accessibilityLabel={showPlay ? "继续" : "暂停"}
            style={[styles.orb, styles.orbShadow]}
          >
            <LinearGradient
              colors={["#3B6FFF", "#6B9BFF"]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.orbFill}
            >
              <Icon
                name={showPlay ? "Play" : "Pause"}
                size={26}
                color="#FFFFFF"
                strokeWidth={2.4}
                fill="#FFFFFF"
              />
            </LinearGradient>
          </Pressable>
          <View style={{ width: 12 }} />
          <Pressable
            onPress={onStop}
            accessibilityLabel="停止"
            style={[
              styles.orb,
              {
                backgroundColor:
                  colorScheme === "dark" ? t.secondary : "#E8ECF4",
              },
            ]}
          >
            <Icon
              name="Square"
              size={18}
              color={t.foreground}
              strokeWidth={2.6}
              fill={t.foreground}
            />
          </Pressable>
        </View>

        <View className="flex-row justify-around px-4 pt-4">
          <Tool icon="Camera" label="拍照" onPress={() => {}} />
          <Tool icon="Paperclip" label="上传附件" onPress={() => {}} />
          <Tool icon="FileText" label="快速记录" onPress={() => {}} />
          <Tool icon="ListChecks" label="记录要点" badge={3} onPress={() => {}} />
        </View>

        <Text className="pt-4 text-center text-xs text-muted-foreground">
          硬件：电量 87% ｜ 存储 32GB 可用
        </Text>
      </View>
    </View>
  );
}

function Capsule({ label, dotColor }: { label: string; dotColor?: string }) {
  const { colorScheme } = useColorScheme();
  const t = THEME[colorScheme];
  return (
    <View
      className="flex-row items-center gap-1.5 rounded-full px-2.5 py-1"
      style={{
        backgroundColor: t.secondary,
        borderWidth: 1,
        borderColor: t.border,
      }}
    >
      {dotColor ? (
        <View
          className="size-1.5 rounded-full"
          style={{ backgroundColor: dotColor }}
        />
      ) : null}
      <Text className="text-xs font-medium text-foreground">{label}</Text>
    </View>
  );
}

function Tool({
  icon,
  label,
  badge,
  onPress,
}: {
  icon: AppIconName;
  label: string;
  badge?: number;
  onPress: () => void;
}) {
  const { colorScheme } = useColorScheme();
  const t = THEME[colorScheme];
  return (
    <Pressable
      onPress={onPress}
      className="items-center gap-1"
      accessibilityLabel={label}
    >
      <View>
        <Icon name={icon} size={22} color={t.foreground} />
        {badge ? (
          <View
            className="absolute -right-2 -top-1 rounded-full px-1"
            style={{ backgroundColor: t.destructive }}
          >
            <Text className="text-[10px] font-medium" style={{ color: "#FFFFFF" }}>
              {badge}
            </Text>
          </View>
        ) : null}
      </View>
      <Text className="text-xs text-muted-foreground">{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  dock: {
    borderTopWidth: 1,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
  },
  orb: {
    width: 52,
    height: 52,
    borderRadius: 26,
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
  },
  orbShadow: {
    shadowColor: "#3B6FFF",
    shadowOpacity: 0.28,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 5,
  },
  orbFill: {
    width: 52,
    height: 52,
    alignItems: "center",
    justifyContent: "center",
  },
});

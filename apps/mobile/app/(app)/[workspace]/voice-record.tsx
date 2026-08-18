/**
 * 录音页 — 接真实加密录音内核。转写内容在后端未就绪时走 Stub/示例。
 * 长按中央按钮的 Overlay 路径不经过本页。
 */
import { useEffect, useRef, useState } from "react";
import { Pressable, ScrollView, StyleSheet, View } from "react-native";
import { Icon, type AppIconName } from "@/components/ui/icon";
import { LinearGradient } from "expo-linear-gradient";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { router, useLocalSearchParams } from "expo-router";
import { Text } from "@/components/ui/text";
import { SampleBadge } from "@/components/recording/sample-badge";
import { useAudioRecording } from "@/hooks/useAudioRecording";
import { useWorkspaceStore } from "@/data/workspace-store";
import { USE_MOCK_RECORDING_CONTENT } from "@/data/mocks/recordings";
import { useColorScheme } from "@/lib/use-color-scheme";
import { THEME } from "@/lib/theme";
import * as Battery from "expo-battery";
import { availableBytes } from "@/services/recording/recordingFs";
import { captureRecordingPhoto } from "@/services/recording/captureRecordingPhoto";

export default function VoiceRecordPage() {
  const { colorScheme } = useColorScheme();
  const t = THEME[colorScheme];
  const insets = useSafeAreaInsets();
  const slug = useWorkspaceStore((s) => s.currentWorkspaceSlug);
  const params = useLocalSearchParams<{ intent?: string }>();
  const showTranslation = params.intent === "translate";
  const rec = useAudioRecording();
  const started = useRef(false);
  const scrollRef = useRef<ScrollView | null>(null);
  const [hw, setHw] = useState("硬件检测中…");

  useEffect(() => {
    if (started.current) return;
    if (rec.isActive) {
      started.current = true;
      return;
    }
    started.current = true;
    void rec.start();
  }, [rec]);

  useEffect(() => {
    scrollRef.current?.scrollToEnd({ animated: true });
  }, [rec.finals.length, rec.partial]);

  useEffect(() => {
    void (async () => {
      const level = await Battery.getBatteryLevelAsync();
      const pct = level >= 0 ? Math.round(level * 100) : null;
      const freeGb = availableBytes() / (1024 * 1024 * 1024);
      setHw(
        `硬件：${pct != null ? `电量 ${pct}%` : "电量 —"} ｜ 存储 ${freeGb.toFixed(1)}GB 可用`,
      );
    })();
  }, []);

  const onPauseResume = () => {
    if (rec.isPaused) void rec.resume();
    else rec.pause();
  };

  const onStop = async () => {
    const id = await rec.stop();
    if (id && slug) router.replace(`/${slug}/recordings/${id}`);
  };

  const statusLabel =
    rec.status === "stopping"
      ? "正在保存"
      : rec.isPaused
        ? "已暂停"
        : rec.status === "failed"
          ? "出错"
          : "转写中";
  const dotColor =
    rec.status === "failed"
      ? t.destructive
      : rec.isPaused
        ? t.warning
        : t.brand;

  return (
    <View className="flex-1 bg-background">
      {USE_MOCK_RECORDING_CONTENT ? (
        <View className="mx-4 mt-2 mb-1 flex-row items-center justify-center gap-2">
          <Text className="text-[11px] text-muted-foreground">
            采集已接入本机加密录音 · 转写为示例
          </Text>
          <SampleBadge visible />
        </View>
      ) : null}

      <View className="flex-row items-center gap-2 px-4 pt-2 pb-3">
        <Capsule label={statusLabel} dotColor={dotColor} />
        <Capsule label="逐句" />
        <Capsule label={showTranslation ? "中文→英文" : "中文"} />
      </View>

      <ScrollView
        ref={scrollRef}
        className="flex-1"
        contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 16 }}
      >
        {rec.finals.length === 0 && !rec.partial ? (
          <View className="py-24 items-center gap-2">
            <Text className="text-sm text-muted-foreground">
              {rec.status === "recording" ? "正在聆听…" : "暂无转写"}
            </Text>
          </View>
        ) : (
          <>
            {rec.finals.map((line, i) => (
              <View key={`${line.startMs}-${i}`} className="mb-4">
                <View
                  className="self-start rounded-full px-2 py-0.5"
                  style={{ backgroundColor: t.secondary }}
                >
                  <Text className="text-xs text-muted-foreground">
                    {line.speaker ?? "说话人"} ·{" "}
                    {String(Math.floor(line.startMs / 1000)).padStart(2, "0")}s
                  </Text>
                </View>
                <Text className="mt-1.5 text-base leading-6 text-foreground">
                  {line.text}
                </Text>
                {showTranslation && line.translation ? (
                  <Text className="mt-0.5 text-sm leading-5 text-muted-foreground">
                    {line.translation}
                  </Text>
                ) : null}
              </View>
            ))}
            {rec.partial ? (
              <Text className="text-base leading-6 text-muted-foreground">
                {rec.partial.text}
              </Text>
            ) : null}
          </>
        )}
      </ScrollView>

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
          <Waveform peaks={rec.peaks} color={t.brand} />
          <Text
            className="text-lg font-bold text-foreground"
            style={{ fontVariant: ["tabular-nums"] }}
          >
            {rec.clock}
          </Text>
          <View className="flex-1" />
          <Pressable
            onPress={onPauseResume}
            accessibilityLabel={rec.isPaused ? "继续" : "暂停"}
            style={[styles.orb, styles.orbShadow]}
          >
            <LinearGradient
              colors={["#3B6FFF", "#6B9BFF"]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.orbFill}
            >
              <Icon
                name={rec.isPaused ? "Play" : "Pause"}
                size={26}
                color="#FFFFFF"
                strokeWidth={2.4}
                fill="#FFFFFF"
              />
            </LinearGradient>
          </Pressable>
          <View style={{ width: 12 }} />
          <Pressable
            onPress={() => void onStop()}
            accessibilityLabel="停止"
            disabled={rec.stopping}
            style={[
              styles.orb,
              {
                backgroundColor:
                  colorScheme === "dark" ? t.secondary : "#E8ECF4",
                opacity: rec.stopping ? 0.5 : 1,
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
          <Tool
            icon="Camera"
            label="拍照"
            onPress={() => void captureRecordingPhoto()}
          />
          <Tool icon="Paperclip" label="上传附件" onPress={() => {}} />
          <Tool icon="FileText" label="快速记录" onPress={() => {}} />
          <Tool icon="ListChecks" label="记录要点" onPress={() => {}} />
        </View>

        <Text className="pt-4 text-center text-xs text-muted-foreground">
          {hw}
        </Text>
      </View>
    </View>
  );
}

function Waveform({ peaks, color }: { peaks: number[]; color: string }) {
  return (
    <View className="flex-row items-end gap-[2px] h-6">
      {peaks.slice(-16).map((p, i) => (
        <View
          key={i}
          style={{
            width: 2,
            height: Math.max(4, p * 22),
            backgroundColor: color,
            borderRadius: 1,
          }}
        />
      ))}
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
  onPress,
}: {
  icon: AppIconName;
  label: string;
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
      <Icon name={icon} size={22} color={t.foreground} />
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

/**
 * 翻译 page — meet-think 结构（纯 UI，无真实 ASR/翻译）。
 *
 * Reached from the central record button's bottom sheet (「翻译」). Mirrors
 * the meet-think translate recording screen: a top hint bar (翻译中 · 端侧
 * 录音 · 对向 · 分段 + live timer), a bilateral subtitle stream (我 → right,
 * 对方 → left), and two hold-to-speak bars (我说 / 对方说) that append a mock
 * line on release. No audio is captured or translated.
 *
 * The native Stack header (title「翻译」+ back) is registered in
 * [workspace]/_layout.tsx; this body draws only the content below it.
 */
import { useEffect, useRef, useState } from "react";
import { Pressable, ScrollView, StyleSheet, View } from "react-native";
import { Image } from "expo-image";
import * as Haptics from "expo-haptics";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Text } from "@/components/ui/text";
import { useColorScheme } from "@/lib/use-color-scheme";
import { THEME } from "@/lib/theme";

type Side = "me" | "other";

type TranslateLine = {
  side: Side;
  time: string;
  text: string;
  translation: string;
};

// meet-think accent colours (mirrors its MtColors.brandPrimary / teal pair).
const BRAND = "#3B6FFF";
const TEAL = "#0D9488";
const TEAL_DARK = "#14B8A6";

const SEED: TranslateLine[] = [
  {
    side: "me",
    time: "00:00",
    text: "您好，今天想先确认一下交付时间。",
    translation: "Hello, I would like to confirm the delivery timeline today.",
  },
  {
    side: "other",
    time: "00:04",
    text: "Sure, we can ship by Friday if the specs are final.",
    translation: "没问题，如果规格已定，我们可以周五发货。",
  },
  {
    side: "me",
    time: "00:09",
    text: "规格已经定稿了，麻烦同步给仓库。",
    translation: "The specs are finalized. Please sync with the warehouse.",
  },
];

/** MM:SS under an hour, HH:MM:SS from an hour — mirrors meet-think's clock. */
function formatClock(totalSeconds: number): string {
  const h = Math.floor(totalSeconds / 3600);
  const m = Math.floor((totalSeconds % 3600) / 60);
  const s = totalSeconds % 60;
  const ss = String(s).padStart(2, "0");
  if (h > 0) return `${h}:${String(m).padStart(2, "0")}:${ss}`;
  return `${m}:${ss}`;
}

export default function VoiceTranslatePage() {
  const { colorScheme } = useColorScheme();
  const t = THEME[colorScheme];
  const insets = useSafeAreaInsets();

  const [elapsed, setElapsed] = useState(0);
  const [lines, setLines] = useState<TranslateLine[]>(SEED);
  const [holding, setHolding] = useState<Side | null>(null);

  const elapsedRef = useRef(0);
  const scrollRef = useRef<ScrollView | null>(null);

  useEffect(() => {
    const id = setInterval(() => {
      elapsedRef.current += 1;
      setElapsed(elapsedRef.current);
    }, 1000);
    return () => clearInterval(id);
  }, []);

  useEffect(() => {
    scrollRef.current?.scrollToEnd({ animated: true });
  }, [lines]);

  const appendLine = (side: Side) => {
    const me = side === "me";
    const line: TranslateLine = me
      ? {
          side,
          time: formatClock(elapsedRef.current),
          text: "（中）这是一段按住说话的示例原文。",
          translation: "This is a sample hold-to-speak source sentence.",
        }
      : {
          side,
          time: formatClock(elapsedRef.current),
          text: "This is a sample utterance from the other side.",
          translation: "（中）这是对方按住说话后的示例译文。",
        };
    setLines((prev) => [...prev, line]);
  };

  const onHoldStart = (side: Side) => {
    setHolding(side);
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  };

  const onHoldEnd = (side: Side) => {
    setHolding(null);
    appendLine(side);
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
  };

  const meAccent = BRAND;
  const otherAccent = colorScheme === "dark" ? TEAL_DARK : TEAL;

  return (
    <View className="flex-1 bg-background">
      {/* 顶部提示条 */}
      <View
        className="mx-4 mt-2 flex-row items-center gap-1.5 rounded-xl px-3 py-2"
        style={{ backgroundColor: t.secondary }}
      >
        <Image
          source="sf:character.bubble"
          tintColor={t.brand}
          style={{ width: 14, height: 14 }}
        />
        <Text className="flex-1 text-xs text-muted-foreground">
          翻译中 · 端侧录音 · 对向 · 分段
        </Text>
        <Text
          className="text-xs font-medium text-muted-foreground"
          style={{ fontVariant: ["tabular-nums"] }}
        >
          {formatClock(elapsed)}
        </Text>
      </View>

      {/* 左右对向气泡 */}
      <ScrollView
        ref={scrollRef}
        className="flex-1"
        contentContainerStyle={{ paddingHorizontal: 16, paddingVertical: 12 }}
      >
        {lines.map((line, i) => (
          <BilateralBubble key={`${line.time}-${i}`} line={line} />
        ))}
      </ScrollView>

      {/* 按住说话 / 松开出译 */}
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
        <View className="flex-row gap-2.5 px-4 pt-3">
          <HoldSpeakBar
            label="我说（中）"
            accent={meAccent}
            active={holding === "me"}
            onHoldStart={() => onHoldStart("me")}
            onHoldEnd={() => onHoldEnd("me")}
          />
          <HoldSpeakBar
            label="对方说（英）"
            accent={otherAccent}
            active={holding === "other"}
            onHoldStart={() => onHoldStart("other")}
            onHoldEnd={() => onHoldEnd("other")}
          />
        </View>
      </View>
    </View>
  );
}

function BilateralBubble({ line }: { line: TranslateLine }) {
  const { colorScheme } = useColorScheme();
  const me = line.side === "me";
  const accent = me ? BRAND : colorScheme === "dark" ? TEAL_DARK : TEAL;
  const tint = me
    ? colorScheme === "dark"
      ? "rgba(91,138,255,0.16)"
      : "rgba(59,111,255,0.10)"
    : colorScheme === "dark"
      ? "rgba(20,184,166,0.16)"
      : "rgba(13,148,136,0.10)";
  const border = me
    ? colorScheme === "dark"
      ? "rgba(91,138,255,0.35)"
      : "rgba(59,111,255,0.22)"
    : colorScheme === "dark"
      ? "rgba(20,184,166,0.35)"
      : "rgba(13,148,136,0.22)";
  const header = me ? "我 · 中" : "对方 · 英";

  return (
    <View
      className="mb-3"
      style={{ flexDirection: "row", justifyContent: me ? "flex-end" : "flex-start" }}
    >
      <View
        style={{
          maxWidth: "78%",
          paddingHorizontal: 12,
          paddingVertical: 10,
          backgroundColor: tint,
          borderColor: border,
          borderWidth: 1,
          borderTopLeftRadius: 14,
          borderTopRightRadius: 14,
          borderBottomLeftRadius: me ? 14 : 4,
          borderBottomRightRadius: me ? 4 : 14,
        }}
      >
        <Text className="text-xs font-bold" style={{ color: accent }}>
          {header} · {line.time}
        </Text>
        <Text className="mt-1.5 text-sm font-semibold leading-5 text-foreground">
          {line.text}
        </Text>
        <Text className="mt-0.5 text-sm leading-5 text-muted-foreground">
          {line.translation}
        </Text>
      </View>
    </View>
  );
}

function HoldSpeakBar({
  label,
  accent,
  active,
  onHoldStart,
  onHoldEnd,
}: {
  label: string;
  accent: string;
  active: boolean;
  onHoldStart: () => void;
  onHoldEnd: () => void;
}) {
  const { colorScheme } = useColorScheme();
  const t = THEME[colorScheme];
  return (
    <Pressable
      onPressIn={onHoldStart}
      onPressOut={onHoldEnd}
      accessibilityLabel={label}
      accessibilityHint="按住说话，松开出译"
      className="h-11 flex-1 flex-row items-center justify-center gap-1.5 rounded-xl"
      style={{
        backgroundColor: active ? `${accent}1A` : t.card,
        borderWidth: active ? 1.5 : 1,
        borderColor: active ? accent : t.border,
      }}
    >
      <Image
        source={active ? "sf:mic.fill" : "sf:mic"}
        tintColor={accent}
        style={{ width: 18, height: 18 }}
      />
      <Text className="text-xs font-bold" style={{ color: accent }}>
        {active ? "松开出译" : label}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  dock: {
    borderTopWidth: 1,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
  },
});

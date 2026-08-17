/**
 * Home hero — asymmetric capture entry inspired by meet-think CaptureHero.
 * Primary: 派单 (brand gradient). Secondary: glass-tinted 新建 / 语音下达.
 */
import { Pressable, View } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { Text } from "@/components/ui/text";
import { Icon } from "@/components/ui/icon";
import { useColorScheme } from "@/lib/use-color-scheme";
import { THEME } from "@/lib/theme";

interface Props {
  onDispatch: () => void;
  onNewIssue: () => void;
  onVoiceHint: () => void;
}

function GlassMiniCard({
  title,
  subtitle,
  icon,
  accent,
  onPress,
}: {
  title: string;
  subtitle: string;
  icon: "Plus" | "Mic";
  accent: string;
  onPress: () => void;
}) {
  const { colorScheme } = useColorScheme();
  const softTop =
    colorScheme === "dark"
      ? "rgba(255,255,255,0.08)"
      : hexWithAlpha(accent, 0.14);
  const softBottom =
    colorScheme === "dark"
      ? "rgba(255,255,255,0.03)"
      : hexWithAlpha(accent, 0.06);
  const rim =
    colorScheme === "dark" ? "rgba(255,255,255,0.12)" : "rgba(59,111,255,0.12)";

  return (
    <Pressable onPress={onPress} className="flex-1 active:opacity-90">
      <View
        className="flex-1 overflow-hidden rounded-[14px] px-3 justify-center"
        style={{
          borderWidth: 1,
          borderColor: rim,
          shadowColor: accent,
          shadowOpacity: 0.06,
          shadowRadius: 8,
          shadowOffset: { width: 0, height: 2 },
          elevation: 1,
        }}
      >
        <LinearGradient
          colors={[softTop, softBottom]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={{ position: "absolute", top: 0, right: 0, bottom: 0, left: 0 }}
        />
        <View
          pointerEvents="none"
          style={{
            position: "absolute",
            right: -18,
            top: -22,
            width: 56,
            height: 56,
            borderRadius: 28,
            backgroundColor: hexWithAlpha(accent, 0.18),
          }}
        />
        <View className="flex-row items-center gap-2">
          <View
            className="size-8 items-center justify-center rounded-[10px]"
            style={{
              backgroundColor:
                colorScheme === "dark"
                  ? "rgba(255,255,255,0.1)"
                  : "rgba(255,255,255,0.72)",
            }}
          >
            <Icon name={icon} size={icon === "Plus" ? 16 : 15} color={accent} strokeWidth={2.3} />
          </View>
          <View className="flex-1">
            <Text className="text-[13px] font-bold text-foreground">{title}</Text>
            <Text className="text-[10px] text-muted-foreground">{subtitle}</Text>
          </View>
        </View>
      </View>
    </Pressable>
  );
}

function hexWithAlpha(_color: string, alpha: number): string {
  // Brand tokens are hsl; keep glass tint on the product blue.
  return `rgba(59,111,255,${alpha})`;
}

export function HomeHero({ onDispatch, onNewIssue, onVoiceHint }: Props) {
  const { colorScheme } = useColorScheme();
  const t = THEME[colorScheme];

  return (
    <View className="flex-row gap-2.5 px-4" style={{ height: 118 }}>
      <Pressable
        onPress={onDispatch}
        className="flex-[5] overflow-hidden rounded-2xl active:opacity-90"
        accessibilityLabel="派单给数字员工"
        style={{
          shadowColor: "#2F62F0",
          shadowOpacity: 0.14,
          shadowRadius: 8,
          shadowOffset: { width: 0, height: 3 },
          elevation: 2,
        }}
      >
        <LinearGradient
          colors={["#2F62F0", "#3B6FFF", "#5B8AFF"]}
          locations={[0, 0.45, 1]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={{ flex: 1, padding: 14, justifyContent: "space-between" }}
        >
          <View
            pointerEvents="none"
            style={{
              position: "absolute",
              right: -12,
              top: -16,
              width: 72,
              height: 72,
              borderRadius: 36,
              backgroundColor: "rgba(255,255,255,0.14)",
            }}
          />
          <View
            pointerEvents="none"
            style={{
              position: "absolute",
              left: -20,
              bottom: -36,
              width: 90,
              height: 90,
              borderRadius: 45,
              backgroundColor: "rgba(6,182,212,0.22)",
            }}
          />
          <View
            pointerEvents="none"
            style={{
              position: "absolute",
              top: 0,
              right: 0,
              bottom: 0,
              left: 0,
              borderRadius: 16,
              borderWidth: 1.1,
              borderColor: "rgba(255,255,255,0.28)",
            }}
          />
          <View className="flex-row items-center gap-2">
            <View
              className="size-8 items-center justify-center rounded-xl"
              style={{ backgroundColor: "rgba(255,255,255,0.2)" }}
            >
              <Icon name="Users" size={16} color="#FFFFFF" strokeWidth={2.2} />
            </View>
            <Text className="text-[11px] font-medium text-white/80">一键派单</Text>
          </View>
          <View>
            <Text className="text-[18px] font-bold text-white">交给数字员工</Text>
            <Text className="text-[12px] text-white/80 mt-0.5">
              选人 · 预填 · 立刻开工
            </Text>
          </View>
        </LinearGradient>
      </Pressable>

      <View className="flex-[4] gap-2.5">
        <GlassMiniCard
          title="新建事项"
          subtitle="手动建单"
          icon="Plus"
          accent={t.brand}
          onPress={onNewIssue}
        />
        <GlassMiniCard
          title="语音下达"
          subtitle="底部中央按钮"
          icon="Mic"
          accent={t.brand}
          onPress={onVoiceHint}
        />
      </View>
    </View>
  );
}

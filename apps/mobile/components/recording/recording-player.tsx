import { useEffect, useMemo, useState } from "react";
import { Pressable, View } from "react-native";
import { useAudioPlayer, useAudioPlayerStatus } from "expo-audio";
import { Icon } from "@/components/ui/icon";
import { Text } from "@/components/ui/text";
import type { RecordingVolume } from "@/data/recording/recordingTypes";
import { volumeAt } from "@/lib/recording/playback";
import { formatClock } from "@/services/recording/recordingElapsed";
import { useColorScheme } from "@/lib/use-color-scheme";
import { THEME } from "@/lib/theme";

export function RecordingPlayer({
  volumes,
  durationMs,
  seekMs,
}: {
  volumes: RecordingVolume[];
  durationMs: number;
  seekMs?: number | null;
}) {
  const { colorScheme } = useColorScheme();
  const t = THEME[colorScheme];
  const [volumeIndex, setVolumeIndex] = useState(0);
  const source = volumes[volumeIndex]?.uri ?? null;
  const player = useAudioPlayer(source);
  const status = useAudioPlayerStatus(player);
  const playing = status.playing;

  const plan = useMemo(
    () => ({ volumes, durationMs }),
    [volumes, durationMs],
  );

  const prefixMs = volumes
    .slice(0, volumeIndex)
    .reduce((n, v) => n + v.durationMs, 0);
  const positionMs = prefixMs + Math.floor((status.currentTime ?? 0) * 1000);

  useEffect(() => {
    const volume = volumes[volumeIndex];
    if (
      playing &&
      volume &&
      status.currentTime * 1000 >= Math.max(0, volume.durationMs - 200) &&
      volumeIndex < volumes.length - 1
    ) {
      const next = volumeIndex + 1;
      setVolumeIndex(next);
      player.replace({ uri: volumes[next]!.uri });
      player.play();
    }
  }, [playing, status.currentTime, volumeIndex, volumes, player]);

  useEffect(() => {
    if (seekMs == null) return;
    const hit = volumeAt(plan, seekMs);
    if (!hit) return;
    const idx = volumes.findIndex((v) => v.file === hit.volume.file);
    if (idx >= 0 && idx !== volumeIndex) {
      setVolumeIndex(idx);
      player.replace({ uri: volumes[idx]!.uri });
    }
    void player.seekTo(hit.offsetMs / 1000);
  }, [seekMs, player, plan, volumeIndex, volumes]);

  const toggle = () => {
    if (playing) player.pause();
    else player.play();
  };

  const progress = durationMs > 0 ? Math.min(1, positionMs / durationMs) : 0;

  return (
    <View className="px-4 pt-3 pb-2 gap-3">
      <View
        className="h-1.5 rounded-full overflow-hidden"
        style={{ backgroundColor: t.secondary }}
      >
        <View
          className="h-full rounded-full"
          style={{ width: `${progress * 100}%`, backgroundColor: t.brand }}
        />
      </View>
      <View className="flex-row items-center gap-3">
        <Pressable
          onPress={toggle}
          accessibilityLabel={playing ? "暂停" : "播放"}
          className="size-12 items-center justify-center rounded-full"
          style={{ backgroundColor: t.brand }}
        >
          <Icon
            name={playing ? "Pause" : "Play"}
            size={22}
            color="#FFFFFF"
            fill="#FFFFFF"
          />
        </Pressable>
        <Text
          className="text-sm font-semibold text-foreground"
          style={{ fontVariant: ["tabular-nums"] }}
        >
          {formatClock(Math.floor(positionMs / 1000))} /{" "}
          {formatClock(Math.floor(durationMs / 1000))}
        </Text>
      </View>
    </View>
  );
}

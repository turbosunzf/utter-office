import { Pressable, View } from "react-native";
import { Image as ExpoImage } from "expo-image";
import { Text } from "@/components/ui/text";
import type { Brief } from "@/data/mocks/briefs";
import { relativeTime } from "@/lib/brief-format";
import { useColorScheme } from "@/lib/use-color-scheme";
import { THEME } from "@/lib/theme";

const RANK_RED = "#E53935";
const RANK_COL = 26;
const RANK_SIZE = 22;
const TITLE_LINE = 22;
const META_SIZE = 12;
const META_LINE = 16;

function RankBadge({ rank }: { rank: number }) {
  const hot = rank <= 3;
  return (
    <View
      style={{
        width: RANK_COL,
        paddingTop: Math.max(0, Math.round((TITLE_LINE - RANK_SIZE) / 2)),
        alignItems: "center",
      }}
    >
      {hot ? (
        <View
          style={{
            width: RANK_SIZE,
            height: RANK_SIZE,
            borderRadius: RANK_SIZE / 2,
            backgroundColor: RANK_RED,
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <Text
            style={{
              color: "#FFFFFF",
              fontSize: 13,
              fontWeight: "800",
              lineHeight: 16,
            }}
          >
            {rank}
          </Text>
        </View>
      ) : (
        <Text
          style={{
            width: RANK_SIZE,
            textAlign: "center",
            fontSize: 14,
            fontWeight: "700",
            lineHeight: RANK_SIZE,
            color: "#9CA3AF",
          }}
        >
          {rank}
        </Text>
      )}
    </View>
  );
}

export function BriefRow({
  brief,
  rank,
  onPress,
}: {
  brief: Brief;
  rank: number;
  onPress: () => void;
}) {
  const { colorScheme } = useColorScheme();
  const t = THEME[colorScheme];
  const imageUrl = brief.image_url?.trim() || null;
  const tagBg = colorScheme === "dark" ? t.secondary : "#F5F5F5";
  const tagLabel = colorScheme === "dark" ? t.mutedForeground : "#8A8A8A";
  const hairline = colorScheme === "dark" ? t.border : "rgba(15,23,42,0.08)";

  return (
    <Pressable
      onPress={onPress}
      accessibilityLabel={`${rank} ${brief.title}`}
      className="active:opacity-90"
    >
      <View
        style={{
          flexDirection: "row",
          alignItems: "flex-start",
          paddingHorizontal: 16,
          paddingTop: 10,
          paddingBottom: 10,
        }}
      >
        <RankBadge rank={rank} />

        <View style={{ flex: 1, minWidth: 0, marginLeft: 8 }}>
          <Text
            className="text-foreground"
            style={{
              fontSize: 16,
              fontWeight: "700",
              lineHeight: TITLE_LINE,
            }}
            numberOfLines={2}
          >
            {brief.title}
          </Text>
          <View
            style={{
              flexDirection: "row",
              alignItems: "center",
              marginTop: 6,
            }}
          >
            <Text
              className="text-muted-foreground"
              style={{ flex: 1, fontSize: META_SIZE, lineHeight: META_LINE }}
              numberOfLines={1}
            >
              {brief.source} {relativeTime(brief.published_at)}
            </Text>
            {brief.hit ? (
              <View
                style={{
                  flexDirection: "row",
                  alignItems: "center",
                  marginLeft: 8,
                  paddingHorizontal: 6,
                  paddingVertical: 2,
                  borderRadius: 3,
                  backgroundColor: tagBg,
                }}
              >
                <Text
                  style={{
                    fontSize: META_SIZE,
                    lineHeight: META_LINE,
                    color: tagLabel,
                  }}
                >
                  {brief.hit.l}
                </Text>
                <Text
                  style={{
                    fontSize: META_SIZE,
                    lineHeight: META_LINE,
                    fontWeight: "600",
                    color: RANK_RED,
                    marginLeft: 4,
                  }}
                >
                  {brief.hit.n}
                </Text>
              </View>
            ) : null}
          </View>
        </View>

        {imageUrl ? (
          <View
            style={{
              width: 76,
              height: 54,
              marginLeft: 10,
              borderRadius: 8,
              overflow: "hidden",
              backgroundColor: t.muted,
            }}
          >
            <ExpoImage
              source={{ uri: imageUrl }}
              style={{ width: 76, height: 54 }}
              contentFit="cover"
            />
          </View>
        ) : null}
      </View>
      <View
        style={{
          height: 1,
          marginHorizontal: 16,
          backgroundColor: hairline,
        }}
      />
    </Pressable>
  );
}

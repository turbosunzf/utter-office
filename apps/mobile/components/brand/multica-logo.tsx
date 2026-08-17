/**
 * Brand logo — PNG mark from `apps/mobile/assets/logo.png`.
 * Used on auth screens; app icon is generated from `assets/icon.png`.
 */
import { Image, type ImageStyle, type StyleProp, View } from "react-native";

interface MulticaLogoProps {
  size?: number;
  /** Kept for API compat with old SVG callers; ignored for the PNG mark. */
  color?: string;
  style?: StyleProp<ImageStyle>;
}

export function MulticaLogo({ size = 48, style }: MulticaLogoProps) {
  return (
    <View style={{ width: size, height: size, borderRadius: size * 0.22, overflow: "hidden" }}>
      <Image
        source={require("../../assets/logo.png")}
        style={[{ width: size, height: size }, style]}
        accessibilityLabel="Utter Office"
      />
    </View>
  );
}

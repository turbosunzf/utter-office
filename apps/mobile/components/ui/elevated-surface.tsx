/**
 * Soft elevated surface — meet-think-inspired card shell without glass blur.
 * Uses brand-neutral white card + restrained shadow.
 */
import type { ReactNode } from "react";
import { View, type ViewProps, type StyleProp, type ViewStyle } from "react-native";
import { cn } from "@/lib/utils";
import { useColorScheme } from "@/lib/use-color-scheme";

const SHADOW_LIGHT = {
  shadowColor: "#0F172A",
  shadowOpacity: 0.06,
  shadowRadius: 12,
  shadowOffset: { width: 0, height: 4 },
  elevation: 3,
} as const;

const SHADOW_DARK = {
  shadowColor: "#000",
  shadowOpacity: 0.35,
  shadowRadius: 10,
  shadowOffset: { width: 0, height: 3 },
  elevation: 4,
} as const;

export function ElevatedSurface({
  children,
  className,
  style,
  ...rest
}: ViewProps & { children: ReactNode; className?: string }) {
  const { colorScheme } = useColorScheme();
  const shadow = colorScheme === "dark" ? SHADOW_DARK : SHADOW_LIGHT;
  return (
    <View
      className={cn(
        "rounded-2xl border border-border bg-card overflow-hidden",
        className,
      )}
      style={[shadow as StyleProp<ViewStyle>, style]}
      {...rest}
    >
      {children}
    </View>
  );
}

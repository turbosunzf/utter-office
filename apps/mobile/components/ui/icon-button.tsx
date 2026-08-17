/**
 * Icon-only button — RNR ghost icon button wrapping the shared Lucide Icon.
 */
import { useTheme } from "@react-navigation/native";
import { Button, type ButtonProps } from "@/components/ui/button";
import { Icon, type AppIconName } from "@/components/ui/icon";

interface Props extends Omit<ButtonProps, "children" | "size"> {
  name: AppIconName;
  /** Glyph size in points. Default 20 matches iOS toolbar icons. */
  iconSize?: number;
  /** Override the icon color. Defaults to NAV_THEME[scheme].text. */
  color?: string;
  strokeWidth?: number;
}

export function IconButton({
  name,
  iconSize = 20,
  color,
  strokeWidth = 2,
  ...buttonProps
}: Props) {
  const { colors } = useTheme();
  return (
    <Button variant="ghost" size="icon" {...buttonProps}>
      <Icon
        name={name}
        size={iconSize}
        color={color ?? colors.text}
        strokeWidth={strokeWidth}
      />
    </Button>
  );
}

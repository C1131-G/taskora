import { type ReactNode } from "react";
import { StyleSheet, Text, View } from "react-native";

import { AnimatedPressable, usePressScale } from "@/components/workspace/workspace-press-scale";
import { useTheme } from "@/theme/theme-provider";
import { FONT_SCALE_CAP, typeStyle } from "@/theme/type-scale";
import { radii, spacing, theme } from "@/theme/tokens.generated";

export type ButtonVariant = "primary" | "secondary" | "ghost" | "danger";
export type ButtonSize = "sm" | "md" | "lg";

const MIN_TOUCH_TARGET = 44;
/** Optical nudge: the icon side of a button takes 2pt less padding. */
const ICON_SIDE_TRIM = 2;

export interface WorkspaceButtonProps {
  readonly children: string;
  readonly disabled?: boolean;
  readonly leadingIcon?: ReactNode;
  readonly onPress?: () => void;
  readonly size?: ButtonSize;
  readonly trailingIcon?: ReactNode;
  readonly variant?: ButtonVariant;
}

const colorsFor = (variant: ButtonVariant, isDark: boolean) => {
  const palette = isDark ? theme.dark : theme.light;
  switch (variant) {
    case "danger":
      return { background: palette.red, text: palette.onAccent };
    case "ghost":
      return { background: "transparent", text: palette.text };
    case "secondary":
      return { background: palette.surface3, text: palette.text };
    case "primary":
    default:
      return { background: palette.accent, text: palette.onAccent };
  }
};

const horizontalPaddingFor = (size: ButtonSize): number =>
  size === "lg" ? spacing.s6 : size === "sm" ? spacing.s3 : spacing.s4;

export const WorkspaceButton = ({
  children,
  disabled = false,
  leadingIcon,
  onPress,
  size = "md",
  trailingIcon,
  variant = "primary",
}: WorkspaceButtonProps) => {
  const { isDark } = useTheme();
  const colors = colorsFor(variant, isDark);
  const label = typeStyle(size === "lg" ? "md" : "sm", { weight: 500 });
  const press = usePressScale(disabled);
  const padding = horizontalPaddingFor(size);

  return (
    <AnimatedPressable
      accessibilityRole="button"
      accessibilityState={{ disabled: disabled || undefined }}
      disabled={disabled}
      onPress={onPress}
      onPressIn={press.onPressIn}
      onPressOut={press.onPressOut}
      style={[
        styles.base,
        size === "lg" ? styles.large : styles.medium,
        {
          backgroundColor: colors.background,
          paddingLeft: leadingIcon === undefined ? padding : padding - ICON_SIDE_TRIM,
          paddingRight: trailingIcon === undefined ? padding : padding - ICON_SIDE_TRIM,
        },
        press.pressStyle,
      ]}
    >
      {leadingIcon === undefined ? null : <View>{leadingIcon}</View>}
      <Text maxFontSizeMultiplier={FONT_SCALE_CAP} style={[label, { color: colors.text }]}>
        {children}
      </Text>
      {trailingIcon === undefined ? null : <View>{trailingIcon}</View>}
    </AnimatedPressable>
  );
};

export interface WorkspaceIconButtonProps {
  readonly accessibilityLabel: string;
  readonly children: ReactNode;
  readonly disabled?: boolean;
  readonly onPress?: () => void;
}

export const WorkspaceIconButton = ({
  accessibilityLabel,
  children,
  disabled = false,
  onPress,
}: WorkspaceIconButtonProps) => {
  const { isDark } = useTheme();
  const palette = isDark ? theme.dark : theme.light;
  const press = usePressScale(disabled);

  return (
    <AnimatedPressable
      accessibilityLabel={accessibilityLabel}
      accessibilityRole="button"
      accessibilityState={{ disabled: disabled || undefined }}
      disabled={disabled}
      onPress={onPress}
      onPressIn={press.onPressIn}
      onPressOut={press.onPressOut}
      style={[
        styles.iconButton,
        { backgroundColor: palette.surface2 },
        press.pressStyle,
      ]}
    >
      {children}
    </AnimatedPressable>
  );
};

const styles = StyleSheet.create({
  base: {
    alignItems: "center",
    borderRadius: radii.md,
    flexDirection: "row",
    gap: spacing.s2,
    justifyContent: "center",
  },
  iconButton: {
    alignItems: "center",
    borderRadius: radii.full,
    height: MIN_TOUCH_TARGET,
    justifyContent: "center",
    width: MIN_TOUCH_TARGET,
  },
  large: {
    minHeight: 48,
  },
  medium: {
    minHeight: MIN_TOUCH_TARGET,
  },
});

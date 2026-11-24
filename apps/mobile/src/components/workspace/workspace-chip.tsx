import { Pressable, StyleSheet, Text, View } from "react-native";
import { X } from "phosphor-react-native";

import { useTheme } from "@/theme/theme-provider";
import { FONT_SCALE_CAP, typeStyle } from "@/theme/type-scale";
import { radii, spacing, theme } from "@/theme/tokens.generated";

type ChipColor = "amber" | "accent" | "gray" | "green" | "red";

export interface WorkspaceChipProps {
  readonly accessibilityLabel?: string;
  /** Role when the chip itself is pressable; filters use "tab" or "button". */
  readonly accessibilityRole?: "button" | "radio" | "tab";
  readonly color?: ChipColor;
  readonly label: string;
  /** Makes the whole chip a 44pt touch target with pressed feedback. */
  readonly onPress?: () => void;
  readonly onRemove?: () => void;
  readonly selected?: boolean;
}

const CHIP_HEIGHT = 28;
const MIN_TOUCH_TARGET = 44;
/** Grows the 28pt chip's touch area to 44pt without changing its layout. */
const CHIP_SLOP_Y = (MIN_TOUCH_TARGET - CHIP_HEIGHT) / 2;
const CHIP_HIT_SLOP = { bottom: CHIP_SLOP_Y, left: 4, right: 4, top: CHIP_SLOP_Y };
const REMOVE_ICON_SIZE = 12;
/** Grows the 12pt remove icon's touch area to 44pt. */
const REMOVE_HIT_SLOP = (MIN_TOUCH_TARGET - REMOVE_ICON_SIZE) / 2;
const PRESSED_OPACITY = 0.7;

export const WorkspaceChip = ({
  accessibilityLabel,
  accessibilityRole = "button",
  color = "gray",
  label,
  onPress,
  onRemove,
  selected = false,
}: WorkspaceChipProps) => {
  const { isDark } = useTheme();
  const palette = isDark ? theme.dark : theme.light;
  const strong = { accent: palette.accent, amber: palette.amber, gray: palette.gray, green: palette.green, red: palette.red }[color];
  const chipStyle = [
    styles.chip,
    selected ? { backgroundColor: strong } : { backgroundColor: palette.surface3 },
  ];
  const text = (
    <Text
      maxFontSizeMultiplier={FONT_SCALE_CAP}
      style={[
        typeStyle("xs", { weight: 500 }),
        { color: selected ? palette.onAccent : palette.text2 },
      ]}
    >
      {label}
    </Text>
  );

  if (onPress !== undefined) {
    return (
      <Pressable
        accessibilityLabel={accessibilityLabel}
        accessibilityRole={accessibilityRole}
        accessibilityState={accessibilityRole === "radio" ? { checked: selected } : { selected }}
        hitSlop={CHIP_HIT_SLOP}
        onPress={onPress}
        style={({ pressed }) => [chipStyle, pressed ? styles.pressed : null]}
      >
        {text}
      </Pressable>
    );
  }

  return (
    <View
      accessibilityState={{ selected: selected || undefined }}
      accessibilityRole={onRemove === undefined ? "text" : undefined}
      style={chipStyle}
    >
      {text}
      {onRemove === undefined ? null : (
        <Pressable
          accessibilityLabel={`Remove ${label}`}
          accessibilityRole="button"
          hitSlop={REMOVE_HIT_SLOP}
          onPress={onRemove}
          style={({ pressed }) => (pressed ? styles.pressed : null)}
        >
          <X color={selected ? palette.onAccent : palette.text3} size={REMOVE_ICON_SIZE} weight="bold" />
        </Pressable>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  chip: {
    alignItems: "center",
    alignSelf: "flex-start",
    borderRadius: radii.full,
    flexDirection: "row",
    gap: spacing.s1,
    minHeight: CHIP_HEIGHT,
    paddingHorizontal: spacing.s3,
    paddingVertical: spacing.s1,
  },
  pressed: {
    opacity: PRESSED_OPACITY,
  },
});

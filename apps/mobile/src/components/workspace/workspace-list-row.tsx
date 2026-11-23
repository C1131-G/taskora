import { memo, type ReactNode } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { CaretRight } from "phosphor-react-native";

import { useTheme } from "@/theme/theme-provider";
import { typeStyle } from "@/theme/type-scale";
import { radii, shadows, spacing, theme } from "@/theme/tokens.generated";

/** The inset between a list group's edge and its rows. */
const GROUP_INSET = spacing.s1;

export interface WorkspaceListRowProps {
  readonly accessibilityLabel?: string;
  readonly leading?: ReactNode;
  readonly onPress?: () => void;
  readonly subtitle?: string;
  readonly title: string;
  readonly trailing?: ReactNode;
}

/**
 * A list row with title, optional subtitle and slots; 44pt minimum height.
 * Memoized: pass primitives and stable callbacks (and a stable `leading` or
 * `trailing` element) so virtualized rows skip re-rendering.
 */
export const WorkspaceListRow = memo(function WorkspaceListRow({
  accessibilityLabel,
  leading,
  onPress,
  subtitle,
  title,
  trailing,
}: WorkspaceListRowProps) {
  const { isDark } = useTheme();
  const palette = isDark ? theme.dark : theme.light;
  const trailingSlot =
    trailing ?? (onPress === undefined ? undefined : <CaretRight color={palette.text3} size={16} weight="bold" />);

  const body = (
    <>
      {leading === undefined ? null : <View style={styles.leading}>{leading}</View>}
      <View style={styles.titles}>
        <Text style={[typeStyle("md", { weight: 500 }), { color: palette.text }]}>{title}</Text>
        {subtitle === undefined ? null : (
          <Text style={[typeStyle("sm"), { color: palette.text3 }]} numberOfLines={2}>
            {subtitle}
          </Text>
        )}
      </View>
      {trailingSlot === undefined ? null : <View style={styles.trailing}>{trailingSlot}</View>}
    </>
  );

  if (onPress === undefined) {
    return <View style={styles.row}>{body}</View>;
  }

  // Rows are high-frequency: the pressed fill is instant, with no motion.
  return (
    <Pressable
      accessibilityLabel={accessibilityLabel}
      accessibilityRole="button"
      onPress={onPress}
      style={({ pressed }) => [
        styles.row,
        { backgroundColor: pressed ? palette.surface2 : "transparent" },
      ]}
    >
      {body}
    </Pressable>
  );
});

export interface WorkspaceListGroupProps {
  readonly children: ReactNode;
  readonly label?: string;
}

/**
 * One elevated card holding a run of rows. Its radius is the row radius plus
 * the inset, so a pressed row's fill sits concentric with the card edge.
 */
export const WorkspaceListGroup = ({ children, label }: WorkspaceListGroupProps) => {
  const { isDark } = useTheme();
  const palette = isDark ? theme.dark : theme.light;

  return (
    <View style={styles.groupStack}>
      {label === undefined ? null : (
        <Text
          accessibilityRole="header"
          style={[typeStyle("sm", { weight: 500 }), styles.groupLabel, { color: palette.text2 }]}
        >
          {label}
        </Text>
      )}
      <View
        style={[
          styles.group,
          {
            backgroundColor: palette.surface,
            boxShadow: (isDark ? shadows.dark : shadows.light).card,
          },
        ]}
      >
        {children}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  group: {
    borderRadius: radii.md + GROUP_INSET,
    padding: GROUP_INSET,
  },
  groupLabel: {
    paddingHorizontal: spacing.s1,
  },
  groupStack: {
    gap: spacing.s2,
  },
  leading: {
    marginRight: spacing.s3,
  },
  row: {
    alignItems: "center",
    borderRadius: radii.md,
    flexDirection: "row",
    minHeight: 44,
    paddingHorizontal: spacing.s3,
    paddingVertical: spacing.s2,
  },
  titles: {
    flex: 1,
    gap: 2,
  },
  trailing: {
    marginLeft: spacing.s2,
  },
});

import { type ReactNode } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";

import { useTheme } from "@/theme/theme-provider";
import { FONT_SCALE_CAP, typeStyle } from "@/theme/type-scale";
import { radii, theme } from "@/theme/tokens.generated";

interface BottomTab {
  readonly badge?: number;
  readonly icon: ReactNode;
  readonly label: string;
}

export interface WorkspaceBottomNavigationProps {
  readonly activeLabel: string;
  readonly items: readonly BottomTab[];
  readonly onSelect: (label: string) => void;
}

const MIN_TOUCH_TARGET = 48;

/** The bottom tab bar; each tab carries an icon, a label and an optional badge. */
export const WorkspaceBottomNavigation = ({
  activeLabel,
  items,
  onSelect,
}: WorkspaceBottomNavigationProps) => {
  const { isDark } = useTheme();
  const palette = isDark ? theme.dark : theme.light;

  return (
    <View
      accessibilityRole="tablist"
      style={styles.host}
    >
      {items.map((item) => {
        const active = item.label === activeLabel;
        const hasBadge = item.badge !== undefined && item.badge > 0;
        // The badge is decorative inside the tab, so its count joins the tab's name.
        const accessibilityLabel = hasBadge ? `${item.label}, ${item.badge} unread` : item.label;
        return (
          <Pressable
            accessible
            accessibilityLabel={accessibilityLabel}
            accessibilityRole="tab"
            accessibilityState={{ selected: active }}
            key={item.label}
            onPress={() => onSelect(item.label)}
            style={({ pressed }) => [
              styles.tab,
              { opacity: pressed ? 0.7 : 1 },
            ]}
          >
            <View style={styles.iconStack}>
              {item.icon}
              {item.badge === undefined || !hasBadge ? null : (
                <View
                  importantForAccessibility="no-hide-descendants"
                  style={[styles.badge, { backgroundColor: palette.red, borderColor: palette.surface }]}
                >
                  <Text maxFontSizeMultiplier={FONT_SCALE_CAP} style={[typeStyle("2xs"), { color: palette.onAccent }]}>
                    {item.badge > 99 ? "99+" : item.badge}
                  </Text>
                </View>
              )}
            </View>
            <Text
              maxFontSizeMultiplier={FONT_SCALE_CAP}
              style={[
                typeStyle("2xs", { weight: active ? 600 : 400 }),
                { color: active ? palette.accent : palette.text3 },
              ]}
            >
              {item.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
};

const styles = StyleSheet.create({
  badge: {
    alignItems: "center",
    borderRadius: radii.full,
    borderWidth: 2,
    justifyContent: "center",
    minHeight: 20,
    minWidth: 20,
    paddingHorizontal: 4,
    position: "absolute",
    right: -10,
    top: -6,
  },
  host: {
    flex: 1,
    flexDirection: "row",
  },
  iconStack: {
    alignItems: "center",
    justifyContent: "center",
  },
  tab: {
    alignItems: "center",
    flex: 1,
    gap: 2,
    justifyContent: "center",
    minHeight: MIN_TOUCH_TARGET,
    paddingVertical: 6,
  },
});

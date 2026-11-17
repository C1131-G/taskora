import { type ReactNode } from "react";
import { ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { useTheme } from "@/theme/theme-provider";
import { typeStyle } from "@/theme/type-scale";
import { spacing, theme } from "@/theme/tokens.generated";

export interface WorkspaceScreenProps {
  readonly children: ReactNode;
  readonly title?: string;
  readonly toolbar?: ReactNode;
}

/** The page frame: safe area, title header and a scrolling, padded content column. */
export const WorkspaceScreen = ({ children, title, toolbar }: WorkspaceScreenProps) => {
  const { isDark } = useTheme();
  const palette = isDark ? theme.dark : theme.light;

  return (
    <SafeAreaView style={[styles.host, { backgroundColor: palette.bg }]} edges={["top"]}>
      {title === undefined ? null : (
        <Text
          accessibilityRole="header"
          numberOfLines={2}
          style={[typeStyle("2xl", { leading: "tight", weight: 600 }), styles.title, { color: palette.text }]}
        >
          {title}
        </Text>
      )}
      {toolbar === undefined ? null : <View style={styles.toolbar}>{toolbar}</View>}
      <ScrollView
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
        style={styles.scroll}
      >
        {children}
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  content: {
    gap: spacing.s4,
    paddingBottom: spacing.s8,
    paddingHorizontal: spacing.s4,
    paddingTop: spacing.s3,
  },
  host: {
    flex: 1,
  },
  scroll: {
    flex: 1,
  },
  title: {
    paddingHorizontal: spacing.s4,
    paddingTop: spacing.s4,
  },
  toolbar: {
    paddingHorizontal: spacing.s4,
    paddingTop: spacing.s3,
  },
});

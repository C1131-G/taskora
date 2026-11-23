import { Link } from "expo-router";
import { StyleSheet, Text } from "react-native";

import { WorkspaceScreen } from "@/components/workspace/workspace-screen";
import { useTheme } from "@/theme/theme-provider";
import { FONT_SCALE_CAP, typeStyle } from "@/theme/type-scale";
import { spacing, theme } from "@/theme/tokens.generated";

/** A link or deep link to a screen the app does not have. */
export default function NotFoundScreen() {
  const { isDark } = useTheme();
  const palette = isDark ? theme.dark : theme.light;

  return (
    <WorkspaceScreen title="Page not found">
      <Text maxFontSizeMultiplier={FONT_SCALE_CAP} style={[typeStyle("md"), { color: palette.text2 }]}>
        This link does not lead to a screen in Taskora.
      </Text>
      <Link
        accessibilityRole="link"
        href="/"
        maxFontSizeMultiplier={FONT_SCALE_CAP}
        replace
        style={[typeStyle("md", { weight: 600 }), styles.link, { color: palette.accent }]}
      >
        Go to home
      </Link>
    </WorkspaceScreen>
  );
}

const styles = StyleSheet.create({
  link: {
    minHeight: 44,
    paddingVertical: spacing.s2,
  },
});

import { type ReactNode } from "react";
import { StyleSheet, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { useTheme } from "@/theme/theme-provider";
import { theme } from "@/theme/tokens.generated";

const HIDDEN_FROM_ASSISTIVE_TECH = {
  accessibilityElementsHidden: true,
  importantForAccessibility: "no-hide-descendants",
} as const;

/** The one element a screen reader finds while something loads. */
const BusyStatus = ({ label }: { readonly label: string }) => (
  <View
    accessibilityLabel={label}
    accessibilityRole="progressbar"
    accessibilityState={{ busy: true }}
    accessible
    pointerEvents="none"
    style={StyleSheet.absoluteFill}
  />
);

export interface WorkspaceLoadingRegionProps {
  readonly children: ReactNode;
  readonly isLoading: boolean;
  /** Read out while loading, e.g. "Loading inbox". */
  readonly label: string;
}

/**
 * Wraps a Skelter screen so assistive tech hears one busy status instead of
 * the placeholder text rendered under the bones. The wrapper View stays
 * mounted (and unstyled, matching Skelter's own root) so loading never
 * remounts the screen; the status is absolutely positioned so it adds no
 * layout box.
 *
 * Pass `hasSkeleton={isLoading}` to the Skelter component inside: once loaded
 * it then renders the plain component, without Skelter's opacity-0 warm-up
 * copy that screen readers would otherwise still reach.
 */
export const WorkspaceLoadingRegion = ({ children, isLoading, label }: WorkspaceLoadingRegionProps) => (
  <>
    <View {...(isLoading ? HIDDEN_FROM_ASSISTIVE_TECH : {})}>{children}</View>
    {isLoading ? <BusyStatus label={label} /> : null}
  </>
);

/**
 * A blank themed frame for gates that cannot know the destination screen
 * yet (session restore); bones that match no screen would be worse.
 */
export const WorkspaceLoadingSurface = () => {
  const { isDark } = useTheme();
  const palette = isDark ? theme.dark : theme.light;

  return (
    <SafeAreaView style={[styles.surface, { backgroundColor: palette.bg }]}>
      <BusyStatus label="Loading" />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  surface: {
    flex: 1,
  },
});

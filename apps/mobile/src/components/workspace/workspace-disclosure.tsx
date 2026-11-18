import { useEffect, useMemo, useState, type ReactNode } from "react";
import { Animated, Easing, Pressable, StyleSheet, Text, View } from "react-native";
import { CaretRight } from "phosphor-react-native";

import { usePrefersReducedMotion } from "@/components/workspace/workspace-reveal-gate";
import { appMotion } from "@/theme/motion";

import { useTheme } from "@/theme/theme-provider";
import { typeStyle } from "@/theme/type-scale";
import { radii, spacing, theme } from "@/theme/tokens.generated";

export interface WorkspaceDisclosureProps {
  readonly children: ReactNode;
  readonly defaultOpen?: boolean;
  readonly header: string;
}

const CARET_DURATION = 150;
const CARET_EASING = Easing.bezier(...appMotion.bezier.standard);

/** Turns the caret a quarter toward the opened body; snaps under reduced motion. */
const useCaretRotation = (open: boolean) => {
  const reducedMotion = usePrefersReducedMotion();
  const [progress] = useState(() => new Animated.Value(open ? 1 : 0));

  useEffect(function rotateCaret() {
    if (reducedMotion) {
      progress.setValue(open ? 1 : 0);
      return;
    }
    const animation = Animated.timing(progress, {
      duration: CARET_DURATION,
      easing: CARET_EASING,
      toValue: open ? 1 : 0,
      useNativeDriver: true,
    });
    animation.start();
    return function stopCaretRotation() {
      animation.stop();
    };
  }, [open, progress, reducedMotion]);

  return useMemo(
    () => ({
      transform: [
        { rotate: progress.interpolate({ inputRange: [0, 1], outputRange: ["0deg", "90deg"] }) },
      ],
    }),
    [progress],
  );
};

/** An expandable section; the header carries the expanded accessibility state. */
export const WorkspaceDisclosure = ({
  children,
  defaultOpen = false,
  header,
}: WorkspaceDisclosureProps) => {
  const { isDark } = useTheme();
  const palette = isDark ? theme.dark : theme.light;
  const [open, setOpen] = useState(defaultOpen);
  const caretRotation = useCaretRotation(open);

  return (
    <View>
      <Pressable
        accessibilityLabel={header}
        accessibilityRole="button"
        accessibilityState={{ expanded: open }}
        onPress={() => setOpen((current) => !current)}
        style={({ pressed }) => [
          styles.header,
          { backgroundColor: pressed ? palette.surface2 : palette.surface },
        ]}
      >
        <Text style={[typeStyle("md", { weight: 500 }), { color: palette.text, flex: 1 }]}>
          {header}
        </Text>
        <Animated.View style={caretRotation}>
          <CaretRight color={palette.text3} size={16} weight="bold" />
        </Animated.View>
      </Pressable>
      {open ? <View style={styles.body}>{children}</View> : null}
    </View>
  );
};

const styles = StyleSheet.create({
  body: {
    paddingHorizontal: spacing.s3,
    paddingVertical: spacing.s2,
  },
  header: {
    alignItems: "center",
    borderRadius: radii.md,
    flexDirection: "row",
    gap: spacing.s2,
    minHeight: 44,
    paddingHorizontal: spacing.s3,
  },
});

import { useEffect, useMemo, useState, type ReactNode } from "react";
import {
  Animated,
  Easing,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
  type LayoutChangeEvent,
} from "react-native";
import { X } from "phosphor-react-native";

import { useBottomInset } from "@/components/workspace/use-bottom-inset";
import { WorkspaceIconButton } from "@/components/workspace/workspace-button";
import { usePrefersReducedMotion } from "@/components/workspace/workspace-reveal-gate";
import { appMotion } from "@/theme/motion";
import { useTheme } from "@/theme/theme-provider";
import { typeStyle } from "@/theme/type-scale";
import { radii, shadows, spacing, theme } from "@/theme/tokens.generated";

export interface WorkspaceSheetProps {
  readonly children: ReactNode;
  readonly onClose: () => void;
  readonly title: string;
  readonly visible: boolean;
}

const ENTER_DURATION = 300;
/** Exits run shorter than enters. */
const EXIT_DURATION = 200;
const DRAWER_EASING = Easing.bezier(...appMotion.bezier.drawer);

/**
 * Drives the sheet's 0 (hidden) to 1 (open) progress. The panel slides by its
 * own measured height, so the enter waits for the first layout; under reduced
 * motion it only cross-fades and needs no measurement.
 */
const useSheetProgress = (visible: boolean, reducedMotion: boolean) => {
  const [rendered, setRendered] = useState(visible);
  const [travel, setTravel] = useState<number | undefined>(undefined);
  const [progress] = useState(() => new Animated.Value(visible ? 1 : 0));

  // Mount first, during render; the animation starts once the panel exists.
  if (visible && !rendered) {
    setRendered(true);
  }

  useEffect(function animateSheetVisibility() {
    if (!rendered || (visible && travel === undefined && !reducedMotion)) {
      return;
    }
    const animation = Animated.timing(progress, {
      duration: visible ? ENTER_DURATION : EXIT_DURATION,
      easing: DRAWER_EASING,
      toValue: visible ? 1 : 0,
      useNativeDriver: true,
    });
    animation.start(({ finished }) => {
      if (finished && !visible) {
        setRendered(false);
        // The next open re-measures: its content may have a different height.
        setTravel(undefined);
      }
    });
    return function stopSheetAnimation() {
      animation.stop();
    };
  }, [visible, rendered, travel, reducedMotion, progress]);

  const onPanelLayout = (event: LayoutChangeEvent): void => {
    const { height } = event.nativeEvent.layout;
    setTravel((current) => (current === height ? current : height));
  };

  return { onPanelLayout, progress, rendered, travel };
};

/** A slide-up sheet used by pickers and dialogs; closes on overlay press or Android back. */
export const WorkspaceSheet = ({ children, onClose, title, visible }: WorkspaceSheetProps) => {
  const { isDark } = useTheme();
  const palette = isDark ? theme.dark : theme.light;
  const bottomInset = useBottomInset();
  const reducedMotion = usePrefersReducedMotion();
  const { onPanelLayout, progress, rendered, travel } = useSheetProgress(visible, reducedMotion);

  // Reduced motion keeps the panel in place and cross-fades it instead. Before
  // the first measurement the panel stays transparent so it never flashes.
  const panelMotion = useMemo(() => {
    if (reducedMotion) {
      return { opacity: progress };
    }
    if (travel === undefined) {
      return { opacity: 0 };
    }
    return {
      transform: [
        { translateY: progress.interpolate({ inputRange: [0, 1], outputRange: [travel, 0] }) },
      ],
    };
  }, [progress, reducedMotion, travel]);

  return (
    <Modal
      animationType="none"
      onRequestClose={onClose}
      statusBarTranslucent
      transparent
      visible={rendered}
    >
      <View
        accessibilityElementsHidden={!visible}
        importantForAccessibility={visible ? "auto" : "no-hide-descendants"}
        pointerEvents={visible ? "auto" : "none"}
        style={styles.host}
      >
        <Animated.View style={[styles.overlay, { backgroundColor: palette.overlay, opacity: progress }]}>
          <Pressable
            accessibilityLabel="Close sheet"
            onPress={onClose}
            style={StyleSheet.absoluteFill}
            testID="sheet-overlay"
          />
        </Animated.View>
        <Animated.View
          accessibilityViewIsModal
          onLayout={onPanelLayout}
          style={[
            styles.panel,
            {
              backgroundColor: palette.surface,
              boxShadow: (isDark ? shadows.dark : shadows.light).pop,
              paddingBottom: bottomInset,
            },
            panelMotion,
          ]}
        >
          <View style={styles.header}>
            <Text
              accessibilityRole="header"
              style={[typeStyle("lg", { weight: 600 }), { color: palette.text, flex: 1 }]}
            >
              {title}
            </Text>
            <WorkspaceIconButton accessibilityLabel="Close" onPress={onClose}>
              <X color={palette.text2} size={18} weight="bold" />
            </WorkspaceIconButton>
          </View>
          <ScrollView
            bounces={false}
            contentContainerStyle={styles.body}
            keyboardShouldPersistTaps="handled"
            overScrollMode="never"
            style={styles.bodyScroll}
          >
            {children}
          </ScrollView>
        </Animated.View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  body: {
    gap: 2,
    paddingBottom: spacing.s4,
    paddingHorizontal: spacing.s3,
  },
  bodyScroll: {
    flexGrow: 0,
    maxHeight: 480,
  },
  header: {
    alignItems: "center",
    flexDirection: "row",
    gap: spacing.s2,
    paddingBottom: spacing.s2,
    paddingLeft: spacing.s4,
    paddingRight: spacing.s3,
    paddingTop: spacing.s3,
  },
  host: {
    flex: 1,
    justifyContent: "flex-end",
  },
  overlay: {
    bottom: 0,
    left: 0,
    position: "absolute",
    right: 0,
    top: 0,
  },
  panel: {
    borderTopLeftRadius: radii.xl + spacing.s2,
    borderTopRightRadius: radii.xl + spacing.s2,
    minHeight: 160,
  },
});

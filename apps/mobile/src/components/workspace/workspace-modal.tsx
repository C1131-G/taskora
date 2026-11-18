import { useEffect, useMemo, useState, type ReactNode } from "react";
import { Animated, Easing, Modal, Pressable, StyleSheet, Text, View } from "react-native";

import { WorkspaceButton } from "@/components/workspace/workspace-button";
import { usePrefersReducedMotion } from "@/components/workspace/workspace-reveal-gate";
import { appMotion } from "@/theme/motion";
import { useTheme } from "@/theme/theme-provider";
import { typeStyle } from "@/theme/type-scale";
import { radii, shadows, spacing, theme } from "@/theme/tokens.generated";

export interface WorkspaceModalProps {
  readonly children: ReactNode;
  readonly onClose: () => void;
  readonly title: string;
  readonly visible: boolean;
}

const ENTER_DURATION = 200;
/** Exits run shorter than enters. */
const EXIT_DURATION = 150;
const MODAL_EASING = Easing.bezier(...appMotion.bezier.standard);

/** A centered dialog; closes on overlay press or Android back. */
export const WorkspaceModal = ({ children, onClose, title, visible }: WorkspaceModalProps) => {
  const { isDark } = useTheme();
  const palette = isDark ? theme.dark : theme.light;
  const reducedMotion = usePrefersReducedMotion();
  const [rendered, setRendered] = useState(visible);
  // 0 is hidden, 1 is open; opacity, scale and offset all derive from it.
  const [progress] = useState(() => new Animated.Value(visible ? 1 : 0));

  // Mount first, during render; the animation starts once the dialog exists.
  if (visible && !rendered) {
    setRendered(true);
  }

  useEffect(function animateModalVisibility() {
    if (!rendered) {
      return;
    }
    const animation = Animated.timing(progress, {
      duration: visible ? ENTER_DURATION : EXIT_DURATION,
      easing: MODAL_EASING,
      toValue: visible ? 1 : 0,
      useNativeDriver: true,
    });
    animation.start(({ finished }) => {
      if (finished && !visible) {
        setRendered(false);
      }
    });
    return function stopModalAnimation() {
      animation.stop();
    };
  }, [visible, rendered, progress]);

  // Reduced motion keeps only the opacity cross-fade.
  const panelMotion = useMemo(
    () =>
      reducedMotion
        ? null
        : {
            transform: [
              { scale: progress.interpolate({ inputRange: [0, 1], outputRange: [0.96, 1] }) },
              { translateY: progress.interpolate({ inputRange: [0, 1], outputRange: [12, 0] }) },
            ],
          },
    [progress, reducedMotion],
  );

  return (
    <Modal
      animationType="none"
      onRequestClose={onClose}
      statusBarTranslucent
      transparent
      visible={rendered}
    >
      <Animated.View
        accessibilityElementsHidden={!visible}
        accessibilityViewIsModal
        importantForAccessibility={visible ? "auto" : "no-hide-descendants"}
        pointerEvents={visible ? "auto" : "none"}
        style={[styles.host, { opacity: progress }]}
      >
        <Pressable
          accessibilityLabel="Close dialog"
          onPress={onClose}
          style={[styles.overlay, { backgroundColor: palette.overlay }]}
          testID="modal-overlay"
        />
        <Animated.View
          // Not `accessible`: that would collapse the dialog into one element and
          // hide its actions from VoiceOver. The title header names it instead.
          accessibilityRole="dialog"
          style={[
            styles.panel,
            {
              backgroundColor: palette.surface,
              boxShadow: (isDark ? shadows.dark : shadows.light).pop,
            },
            panelMotion,
          ]}
        >
          <Text
            accessibilityRole="header"
            style={[typeStyle("lg", { weight: 600 }), { color: palette.text }]}
          >
            {title}
          </Text>
          {children}
        </Animated.View>
      </Animated.View>
    </Modal>
  );
};

export interface WorkspaceConfirmDialogProps {
  readonly cancelLabel?: string;
  readonly confirmLabel: string;
  readonly destructive?: boolean;
  readonly message: string;
  readonly onCancel: () => void;
  readonly onConfirm: () => void;
  readonly title: string;
  readonly visible: boolean;
}

export const WorkspaceConfirmDialog = ({
  cancelLabel = "Cancel",
  confirmLabel,
  destructive = false,
  message,
  onCancel,
  onConfirm,
  title,
  visible,
}: WorkspaceConfirmDialogProps) => {
  const { isDark } = useTheme();
  const palette = isDark ? theme.dark : theme.light;

  return (
    <WorkspaceModal onClose={onCancel} title={title} visible={visible}>
      <Text style={[typeStyle("md"), styles.message, { color: palette.text2 }]}>{message}</Text>
      <View style={styles.actions}>
        <WorkspaceButton onPress={onCancel} variant="ghost">
          {cancelLabel}
        </WorkspaceButton>
        <WorkspaceButton onPress={onConfirm} variant={destructive ? "danger" : "primary"}>
          {confirmLabel}
        </WorkspaceButton>
      </View>
    </WorkspaceModal>
  );
};

const styles = StyleSheet.create({
  actions: {
    flexDirection: "row",
    gap: spacing.s2,
    justifyContent: "flex-end",
    marginTop: spacing.s4,
  },
  host: {
    flex: 1,
  },
  message: {
    marginTop: spacing.s2,
  },
  overlay: {
    bottom: 0,
    left: 0,
    position: "absolute",
    right: 0,
    top: 0,
  },
  panel: {
    alignSelf: "center",
    // Concentric with the inset action buttons: radius md plus the s4 padding.
    borderRadius: radii.md + spacing.s4,
    marginTop: "30%",
    maxWidth: 420,
    padding: spacing.s4,
    width: "88%",
  },
});

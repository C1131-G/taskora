import { useEffect, useMemo, useState } from "react";
import { Animated, Easing, Pressable, StyleSheet, Text } from "react-native";
import { X } from "phosphor-react-native";

import { useBottomInset } from "@/components/workspace/use-bottom-inset";
import { usePrefersReducedMotion } from "@/components/workspace/workspace-reveal-gate";
import { appMotion } from "@/theme/motion";
import { useTheme } from "@/theme/theme-provider";
import { typeStyle } from "@/theme/type-scale";
import { radii, shadows, spacing, theme } from "@/theme/tokens.generated";

export interface WorkspaceUndoToastProps {
  readonly actionLabel?: string;
  readonly message: string;
  readonly onAction?: () => void;
  readonly onClose: () => void;
  readonly visible: boolean;
}

const ENTER_DURATION = 200;
/** Exits run shorter than enters. */
const EXIT_DURATION = 150;
/** A queued message replacing the current one fades its text in. */
const SWAP_DURATION = 150;
const ENTER_OFFSET = 16;
const TOAST_EASING = Easing.bezier(...appMotion.bezier.standard);
/** Gap between the toast and the bottom safe area (home indicator). */
const TOAST_BOTTOM_GAP = 24;
const MIN_TOUCH_TARGET = 44;
const DISMISS_ICON_SIZE = 16;
/** Grows the 16pt dismiss icon's touch area to 44pt. */
const DISMISS_HIT_SLOP = (MIN_TOUCH_TARGET - DISMISS_ICON_SIZE) / 2;
/** The Undo label is ~20pt tall; this lifts its touch area past 44pt. */
const ACTION_HIT_SLOP = { bottom: 12, left: 8, right: 8, top: 12 };

/** Mounts the toast, runs its enter/exit and keeps the last text through the exit. */
const useToastMotion = (message: string, visible: boolean) => {
  const [rendered, setRendered] = useState(visible);
  const [shownMessage, setShownMessage] = useState(message);
  const [progress] = useState(() => new Animated.Value(visible ? 1 : 0));
  const [textOpacity] = useState(() => new Animated.Value(1));

  // The exit keeps showing the departing text instead of an empty toast.
  if (visible && message !== shownMessage) {
    setShownMessage(message);
  }

  // Mount first, during render; the animation starts once the toast exists.
  if (visible && !rendered) {
    setRendered(true);
  }

  useEffect(function animateToastVisibility() {
    if (!rendered) {
      return;
    }
    const animation = Animated.timing(progress, {
      duration: visible ? ENTER_DURATION : EXIT_DURATION,
      easing: TOAST_EASING,
      toValue: visible ? 1 : 0,
      useNativeDriver: true,
    });
    animation.start(({ finished }) => {
      if (finished && !visible) {
        setRendered(false);
      }
    });
    return function stopToastAnimation() {
      animation.stop();
    };
  }, [visible, rendered, progress]);

  useEffect(function fadeInSwappedMessage() {
    textOpacity.setValue(0);
    const animation = Animated.timing(textOpacity, {
      duration: SWAP_DURATION,
      easing: TOAST_EASING,
      toValue: 1,
      useNativeDriver: true,
    });
    animation.start();
    return function stopMessageFade() {
      animation.stop();
    };
  }, [shownMessage, textOpacity]);

  return { progress, rendered, shownMessage, textOpacity };
};

/** A bottom toast with an optional undo action; screens own the timer. */
export const WorkspaceUndoToast = ({
  actionLabel = "Undo",
  message,
  onAction,
  onClose,
  visible,
}: WorkspaceUndoToastProps) => {
  const { isDark } = useTheme();
  const reducedMotion = usePrefersReducedMotion();
  const bottomInset = useBottomInset();
  const { progress, rendered, shownMessage, textOpacity } = useToastMotion(message, visible);

  // Reduced motion keeps the fade and drops the rise.
  const toastMotion = useMemo(
    () =>
      reducedMotion
        ? { opacity: progress }
        : {
            opacity: progress,
            transform: [
              {
                translateY: progress.interpolate({
                  inputRange: [0, 1],
                  outputRange: [ENTER_OFFSET, 0],
                }),
              },
            ],
          },
    [progress, reducedMotion],
  );

  if (!rendered) {
    return null;
  }

  return (
    <Animated.View
      accessibilityElementsHidden={!visible}
      accessibilityLiveRegion="polite"
      importantForAccessibility={visible ? "auto" : "no-hide-descendants"}
      pointerEvents={visible ? "auto" : "none"}
      style={[
        styles.toast,
        {
          backgroundColor: isDark ? theme.dark.surface3 : theme.light.text,
          bottom: bottomInset + TOAST_BOTTOM_GAP,
          boxShadow: (isDark ? shadows.dark : shadows.light).pop,
        },
        toastMotion,
      ]}
    >
      <Animated.Text
        accessibilityRole="alert"
        style={[
          typeStyle("sm"),
          { color: isDark ? theme.dark.text : theme.light.textInv, flex: 1, opacity: textOpacity },
        ]}
      >
        {shownMessage}
      </Animated.Text>
      {onAction === undefined ? null : (
        <Pressable
          accessibilityRole="button"
          hitSlop={ACTION_HIT_SLOP}
          onPress={onAction}
          style={({ pressed }) => ({ opacity: pressed ? 0.7 : 1 })}
        >
          <Text
            style={[
              typeStyle("sm", { weight: 600 }),
              { color: isDark ? theme.dark.accent : theme.light.accent },
            ]}
          >
            {actionLabel}
          </Text>
        </Pressable>
      )}
      <Pressable
        accessibilityLabel="Dismiss"
        accessibilityRole="button"
        hitSlop={DISMISS_HIT_SLOP}
        onPress={onClose}
        style={({ pressed }) => ({ opacity: pressed ? 0.7 : 1 })}
      >
        <X color={isDark ? theme.dark.text3 : theme.light.textInv} size={DISMISS_ICON_SIZE} weight="bold" />
      </Pressable>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  toast: {
    alignItems: "center",
    alignSelf: "center",
    borderRadius: radii.lg,
    flexDirection: "row",
    gap: spacing.s3,
    paddingHorizontal: spacing.s4,
    paddingVertical: spacing.s3,
    position: "absolute",
    width: "92%",
    zIndex: 100,
  },
});

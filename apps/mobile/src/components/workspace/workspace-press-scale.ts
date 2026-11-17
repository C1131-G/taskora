import { useMemo, useState } from "react";
import { Animated, Easing, Pressable } from "react-native";

import { usePrefersReducedMotion } from "@/components/workspace/workspace-reveal-gate";
import { appMotion } from "@/theme/motion";

/** A Pressable whose static style may carry Animated values. */
export const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

const PRESSED_SCALE = 0.96;
/** Reduced-motion users get an opacity dip instead of movement. */
const PRESSED_OPACITY_RATIO = 0.8;
const DISABLED_OPACITY = 0.5;
const PRESS_DURATION = 150;
const PRESS_EASING = Easing.bezier(...appMotion.bezier.standard);

/**
 * Press feedback for buttons: scales to 0.96 over 150ms, or dips opacity
 * under reduced motion. The hook owns the control's opacity so a disabled
 * control stays dimmed in both modes. A disabled control never animates.
 * Timing retargets from the current value, so a fast release reverses mid-flight.
 */
export const usePressScale = (disabled = false) => {
  const reducedMotion = usePrefersReducedMotion();
  const [progress] = useState(() => new Animated.Value(0));
  const baseOpacity = disabled ? DISABLED_OPACITY : 1;

  const pressStyle = useMemo(
    () =>
      reducedMotion
        ? {
            opacity: progress.interpolate({
              inputRange: [0, 1],
              outputRange: [baseOpacity, baseOpacity * PRESSED_OPACITY_RATIO],
            }),
          }
        : {
            opacity: baseOpacity,
            transform: [
              { scale: progress.interpolate({ inputRange: [0, 1], outputRange: [1, PRESSED_SCALE] }) },
            ],
          },
    [baseOpacity, progress, reducedMotion],
  );

  const animateTo = (toValue: number): void => {
    Animated.timing(progress, {
      duration: PRESS_DURATION,
      easing: PRESS_EASING,
      toValue,
      useNativeDriver: true,
    }).start();
  };

  return {
    onPressIn: () => {
      if (!disabled) {
        animateTo(1);
      }
    },
    onPressOut: () => animateTo(0),
    pressStyle,
  };
};

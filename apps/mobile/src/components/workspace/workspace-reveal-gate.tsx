import { useEffect, useState, useSyncExternalStore, type ReactNode } from "react";
import { AccessibilityInfo, Animated, Easing } from "react-native";

import { appMotion } from "@/theme/motion";

/**
 * One app-wide reduced-motion store: a single AccessibilityInfo subscription
 * shared by every hook instance, so a component mounted after the first read
 * gets the real value on its first render instead of a false-then-true flip.
 * Reanimated's useReducedMotion is synchronous but never updates mid-session.
 */
let reducedMotionValue = false;
const listeners = new Set<() => void>();
let removeSystemListener: (() => void) | undefined;

const publish = (value: boolean): void => {
  if (value === reducedMotionValue) {
    return;
  }
  reducedMotionValue = value;
  for (const listener of listeners) {
    listener();
  }
};

const startSystemListener = (): void => {
  let active = true;
  const readPreference = async (): Promise<void> => {
    const value = await AccessibilityInfo.isReduceMotionEnabled();
    if (active) {
      publish(value);
    }
  };
  void readPreference();
  const subscription = AccessibilityInfo.addEventListener("reduceMotionChanged", publish);
  removeSystemListener = () => {
    active = false;
    subscription.remove();
  };
};

const subscribe = (listener: () => void): (() => void) => {
  listeners.add(listener);
  if (listeners.size === 1) {
    startSystemListener();
  }
  return () => {
    listeners.delete(listener);
    if (listeners.size === 0) {
      removeSystemListener?.();
      removeSystemListener = undefined;
    }
  };
};

const readReducedMotion = (): boolean => reducedMotionValue;

/** Reads the OS reduced-motion preference as reactive state. */
export const usePrefersReducedMotion = (): boolean =>
  useSyncExternalStore(subscribe, readReducedMotion, readReducedMotion);

const REVEAL_EASING = Easing.bezier(...appMotion.bezier.standard);

export interface WorkspaceRevealGateProps {
  readonly children: ReactNode;
}

/** Fades its children in once; respects the reduced-motion preference. */
export const WorkspaceRevealGate = ({ children }: WorkspaceRevealGateProps) => {
  const reducedMotion = usePrefersReducedMotion();
  const [opacity] = useState(() => new Animated.Value(reducedMotion ? 1 : 0));

  useEffect(() => {
    if (reducedMotion) {
      opacity.setValue(1);
      return;
    }
    const animation = Animated.timing(opacity, {
      duration: appMotion.durations.standard,
      easing: REVEAL_EASING,
      toValue: 1,
      useNativeDriver: true,
    });
    animation.start();
    return () => animation.stop();
  }, [reducedMotion, opacity]);

  return <Animated.View style={{ opacity }}>{children}</Animated.View>;
};

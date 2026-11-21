"use client";

import type { ReactNode } from "react";
import { Suspense, ViewTransition, useCallback, useEffect, useRef, useState } from "react";

import { useHydrated } from "@/components/workspace/use-hydrated";

const SHOW_DELAY_MS = 150;
const MIN_DISPLAY_MS = 150;

// A client-side navigation mounts the fallback only after a short delay, so
// fast or cached content never flashes a skeleton over the page still on
// screen. The first load has no page to keep: the server HTML and hydration
// show the skeleton at once, so the area never sits blank while data streams.
const DelayedFallback = ({
  children,
  onVisible,
}: {
  readonly children: ReactNode;
  readonly onVisible: () => void;
}): ReactNode => {
  const hydrated = useHydrated();
  const [visible, setVisible] = useState(!hydrated);

  useEffect(
    function scheduleFallbackVisibility() {
      if (visible) {
        onVisible();
        return;
      }
      function showFallback() {
        setVisible(true);
        onVisible();
      }
      const timer = setTimeout(showFallback, SHOW_DELAY_MS);
      return function cancelFallbackVisibility() {
        clearTimeout(timer);
      };
    },
    [onVisible, visible]
  );

  if (!visible) {
    return null;
  }
  return children;
};

// Once the fallback has been visible, keep it up for a minimum duration
// so its appearance/disappearance does not feel abrupt. While waiting, the
// skeleton stays on screen: rendering nothing would flash a blank gap between
// the skeleton and the content.
const MinDisplayGate = ({
  children,
  fallback,
  fallbackShownAt,
}: {
  readonly children: ReactNode;
  readonly fallback: ReactNode;
  readonly fallbackShownAt: React.RefObject<number | null>;
}): ReactNode => {
  const [ready, setReady] = useState(fallbackShownAt.current === null);

  useEffect(function enforceMinimumDisplay() {
    function markReady() {
      setReady(true);
    }
    const shownAt = fallbackShownAt.current;
    if (shownAt === null) {
      markReady();
      return;
    }
    const remaining = MIN_DISPLAY_MS - (Date.now() - shownAt);
    if (remaining <= 0) {
      markReady();
      return;
    }
    const timer = setTimeout(markReady, remaining);
    return function cancelMinimumDisplay() {
      clearTimeout(timer);
    };
  }, [fallbackShownAt]);

  if (!ready) {
    return fallback;
  }
  return children;
};

// A Suspense boundary whose content rises in when it replaces the skeleton.
// The skeleton has no exit animation: the live root swaps it out in place.
// Revalidations keep `default="none"`, so refreshed content never re-animates.
export const SuspenseReveal = ({
  children,
  fallback,
}: {
  readonly children: ReactNode;
  readonly fallback: ReactNode;
}) => {
  const fallbackShownAt = useRef<number | null>(null);
  const markFallbackShown = useCallback(function markFallbackShown() {
    if (fallbackShownAt.current === null) {
      fallbackShownAt.current = Date.now();
    }
  }, []);

  return (
    <Suspense
      fallback={
        <DelayedFallback onVisible={markFallbackShown}>
          {fallback}
        </DelayedFallback>
      }
    >
      <ViewTransition default="none" enter="reveal">
        <MinDisplayGate fallback={fallback} fallbackShownAt={fallbackShownAt}>
          {children}
        </MinDisplayGate>
      </ViewTransition>
    </Suspense>
  );
};

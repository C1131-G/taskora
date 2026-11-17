import { Effect } from "effect";
import { createContext, useCallback, useContext } from "react";

import type { Haptics } from "@/services/haptics";

/** The haptic events the Haptics service offers. */
export type HapticEvent = keyof Haptics["Service"];

/** The Haptics service from the session gate; absent in tests and before boot. */
export const HapticsContext = createContext<Haptics["Service"] | undefined>(undefined);

/**
 * Fires one haptic per user action. Haptics are off for many users and silent
 * on most Android hardware, so callers always pair this with a visual change.
 */
export const useHapticFeedback = (): ((event: HapticEvent) => void) => {
  const haptics = useContext(HapticsContext);
  return useCallback(
    (event: HapticEvent) => {
      if (haptics !== undefined) {
        // runPromiseExit never rejects: a missing vibrator is not an app error.
        void Effect.runPromiseExit(haptics[event]);
      }
    },
    [haptics],
  );
};

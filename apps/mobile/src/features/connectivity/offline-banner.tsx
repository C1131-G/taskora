import { useEffect } from "react";

import { useErrorToast } from "@/components/workspace/error-toast-provider";
import { appRuntime } from "@/runtime/runtime";
import { Connectivity } from "@/services/connectivity";
import { Effect, Fiber, Stream } from "effect";

/**
 * Announces going offline. TanStack's online manager is fed by the query
 * manager wiring the session gate forks, not here. Reduced-motion
 * friendly: no animation, just the live-region announcement.
 */
export const OfflineBanner = () => {
  const showError = useErrorToast();

  useEffect(function watchConnectivity() {
    const runtime = appRuntime();
    let wasOnline = true;
    const wiring = Effect.flatMap(Effect.service(Connectivity), (connectivity) =>
      Stream.runDrain(
        Stream.tap(connectivity.changes, (value) =>
          Effect.sync(() => {
            if (!value && wasOnline) {
              showError("You are offline. Changes wait until the connection returns.");
            }
            wasOnline = value;
          }),
        ),
      ),
    );
    const fiber = runtime.runFork(wiring);
    return function stopWatchingConnectivity() {
      void runtime.runFork(Fiber.interrupt(fiber));
    };
  }, [showError]);

  return null;
};

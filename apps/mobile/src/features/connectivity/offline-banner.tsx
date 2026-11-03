import { useEffect } from "react";

import { useErrorToast } from "@/components/workspace/error-toast-provider";
import { appRuntime } from "@/runtime/runtime";
import { Connectivity } from "@/services/connectivity";
import { onlineManager } from "@tanstack/react-query";
import { Effect, Fiber, Stream } from "effect";

/**
 * Shows a banner while the device is offline and mirrors the connectivity
 * stream into TanStack's online manager. Reduced-motion friendly: no
 * animation, just the live-region announcement.
 */
export const OfflineBanner = () => {
  const showError = useErrorToast();

  useEffect(() => {
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
            onlineManager.setOnline(value);
          }),
        ),
      ),
    );
    const fiber = runtime.runFork(wiring);
    return () => {
      void runtime.runFork(Fiber.interrupt(fiber));
    };
  }, [showError]);

  return null;
};

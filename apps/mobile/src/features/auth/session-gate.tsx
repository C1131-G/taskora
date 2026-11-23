import { Effect, Exit, Fiber, Stream } from "effect";
import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { useQueryClient } from "@tanstack/react-query";

import { AppLifecycle } from "@/services/app-lifecycle";
import { Connectivity } from "@/services/connectivity";
import { Haptics } from "@/services/haptics";
import { MobileApi } from "@/services/mobile-api";
import { ApiContext, KeysContext, failureOf } from "@/runtime/api-hooks";
import { IdempotencyKeys } from "@/services/idempotency-keys";
import { Session, type SessionService, type SessionState } from "@/services/session";
import { HapticsContext } from "@/runtime/haptics-hooks";
import { useBackgroundRefreshToasts } from "@/runtime/query-client";
import { queryManagerWiring } from "@/runtime/query-managers";
import { appRuntime } from "@/runtime/runtime";
import { useErrorToast } from "@/components/workspace/error-toast-context";
import { failureMessage } from "@/components/workspace/workspace-error-state";

export interface SessionGateValue {
  readonly restored: boolean;
  readonly state: SessionState;
}

const initialGateValue: SessionGateValue = {
  restored: false,
  state: { kind: "anonymous" },
};

export const SessionStateContext = createContext<SessionGateValue>(initialGateValue);

export const useSessionState = (): SessionGateValue => useContext(SessionStateContext);

export const SessionGateContext = createContext<SessionService | null>(null);

// Who the cached reads belong to: a different user or token must not see them.
const sessionIdentity = (state: SessionState): string | null =>
  state.kind === "authenticated" ? `${state.me.id}:${state.token}` : null;

/**
 * Restores the session once, forks the client idle watch and the TanStack
 * focus/online wiring, mirrors the session state for the group layouts,
 * clears the query cache whenever the signed-in identity changes and
 * exposes the session to screens.
 */
export const SessionGate = ({ children }: { children: ReactNode }) => {
  // `restored` turns true only when the restore has finished, so the layouts
  // never redirect on the placeholder anonymous state.
  const [restored, setRestored] = useState(initialGateValue.restored);
  const [state, setState] = useState<SessionState>(initialGateValue.state);
  const value = useMemo<SessionGateValue>(() => ({ restored, state }), [restored, state]);
  const [session, setSession] = useState<SessionService | null>(null);
  const [api, setApi] = useState<MobileApi["Service"] | null>(null);
  const [keys, setKeys] = useState<IdempotencyKeys["Service"] | null>(null);
  const [haptics, setHaptics] = useState<Haptics["Service"] | undefined>(undefined);
  const showError = useErrorToast();
  const queryClient = useQueryClient();
  useBackgroundRefreshToasts();

  useEffect(function startSessionServices() {
    const runtime = appRuntime();
    // Strict Mode and remounts run setup twice; only the live run may fork
    // watchers, and its fibers stop with it.
    let disposed = false;
    const fibers: Fiber.Fiber<unknown, unknown>[] = [];
    const setup = Effect.gen(function* () {
      const api = yield* Effect.service(MobileApi);
      const connectivity = yield* Effect.service(Connectivity);
      const keys = yield* Effect.service(IdempotencyKeys);
      const lifecycle = yield* Effect.service(AppLifecycle);
      const sessionService = yield* Effect.service(Session);
      const hapticsService = yield* Effect.service(Haptics);
      return { api, connectivity, hapticsService, keys, lifecycle, sessionService };
    });
    // undefined until the first emission, so the first state never clears.
    let identity: string | null | undefined = undefined;
    const followSession = (next: SessionState): void => {
      const nextIdentity = sessionIdentity(next);
      // Cleared before the state lands, so no render shows the old user's data.
      if (identity !== undefined && identity !== nextIdentity) queryClient.clear();
      identity = nextIdentity;
      setState(next);
    };

    void (async () => {
      const result = await runtime.runPromiseExit(Effect.gen(function* () {
        const { api, connectivity, hapticsService, keys, lifecycle, sessionService } = yield* setup;
        if (disposed) return;
        yield* Effect.sync(() => setSession(sessionService));
        yield* Effect.sync(() => setApi(api));
        yield* Effect.sync(() => setKeys(keys));
        yield* Effect.sync(() => setHaptics(hapticsService));
        fibers.push(runtime.runFork(
          Stream.runDrain(
            Stream.tap(sessionService.changes, (state) =>
              Effect.sync(() => followSession(state)),
            ),
          ),
        ));
        // Foreground and reconnect refetches: feeds AppState and NetInfo
        // into TanStack's focus and online managers.
        fibers.push(runtime.runFork(queryManagerWiring({ connectivity, lifecycle })));
        fibers.push(runtime.runFork(Effect.forever(Effect.catchEager(
          sessionService.watchClientIdle(lifecycle.changes, "2 hours"),
          (failure) => Effect.sync(() => showError("_tag" in failure ? failureMessage(failure) : failure.message)),
        ))));
        // The state is read again on completion and set together with
        // `restored`, so the first restored render already has the result.
        const markRestored = Effect.flatMap(sessionService.current, (current) =>
          Effect.sync(() => {
            followSession(current);
            setRestored(true);
          }),
        );
        fibers.push(runtime.runFork(Effect.flatMap(Effect.exit(Effect.ensuring(sessionService.restore, markRestored)), (result) => {
          if (Exit.isSuccess(result)) return Effect.void;
          const failure = failureOf(result);
          return Effect.sync(() => showError(failure === undefined
            ? "Could not restore your session. Please sign in again."
            : failureMessage(failure)));
        })));
      }));
      if (Exit.isFailure(result) && !disposed) {
        showError("Could not start your session. Please restart the app.");
      }
    })();
    return function stopSessionServices() {
      disposed = true;
      for (const fiber of fibers) {
        void runtime.runFork(Fiber.interrupt(fiber));
      }
    };
  }, [queryClient, showError]);

  return (
    <SessionStateContext value={value}>
      <SessionGateContext value={session}>
        <ApiContext value={api}>
          <KeysContext value={keys}>
            <HapticsContext value={haptics}>{children}</HapticsContext>
          </KeysContext>
        </ApiContext>
      </SessionGateContext>
    </SessionStateContext>
  );
};

/** The session for screens; only valid inside the gate. */
export const useGateSession = (): SessionService | null => useContext(SessionGateContext);

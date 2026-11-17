import { Effect, Exit, Stream } from "effect";
import { createContext, useContext, useEffect, useState, type ReactNode } from "react";

import { AppLifecycle } from "@/services/app-lifecycle";
import { Haptics } from "@/services/haptics";
import { MobileApi } from "@/services/mobile-api";
import { ApiContext, KeysContext, failureOf } from "@/runtime/api-hooks";
import { IdempotencyKeys } from "@/services/idempotency-keys";
import { Session, type SessionService, type SessionState } from "@/services/session";
import { HapticsContext } from "@/runtime/haptics-hooks";
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

/**
 * Restores the session once, forks the client idle watch, mirrors the
 * session state for the group layouts and exposes the session to screens.
 */
export const SessionGate = ({ children }: { children: ReactNode }) => {
  const [value, setValue] = useState<SessionGateValue>(initialGateValue);
  const [session, setSession] = useState<SessionService | null>(null);
  const [api, setApi] = useState<MobileApi["Service"] | null>(null);
  const [keys, setKeys] = useState<IdempotencyKeys["Service"] | null>(null);
  const [haptics, setHaptics] = useState<Haptics["Service"] | undefined>(undefined);
  const showError = useErrorToast();

  useEffect(() => {
    const runtime = appRuntime();
    const setup = Effect.gen(function* () {
      const api = yield* Effect.service(MobileApi);
      const keys = yield* Effect.service(IdempotencyKeys);
      const lifecycle = yield* Effect.service(AppLifecycle);
      const sessionService = yield* Effect.service(Session);
      const hapticsService = yield* Effect.service(Haptics);
      return { api, hapticsService, keys, lifecycle, sessionService };
    });

    void (async () => {
      const result = await runtime.runPromiseExit(Effect.gen(function* () {
        const { api, hapticsService, keys, lifecycle, sessionService } = yield* setup;
        yield* Effect.sync(() => setSession(sessionService));
        yield* Effect.sync(() => setApi(api));
        yield* Effect.sync(() => setKeys(keys));
        yield* Effect.sync(() => setHaptics(hapticsService));
        runtime.runFork(
          Stream.runDrain(
            Stream.tap(sessionService.changes, (state) =>
              Effect.sync(() => setValue({ restored: true, state })),
            ),
          ),
        );
        runtime.runFork(Effect.forever(Effect.catchEager(
          sessionService.watchClientIdle(lifecycle.changes, "2 hours"),
          (failure) => Effect.sync(() => showError("_tag" in failure ? failureMessage(failure) : failure.message)),
        )));
        runtime.runFork(Effect.flatMap(Effect.exit(sessionService.restore), (result) => {
          if (Exit.isSuccess(result)) return Effect.void;
          const failure = failureOf(result);
          return Effect.sync(() => showError(failure === undefined
            ? "Could not restore your session. Please sign in again."
            : failureMessage(failure)));
        }));
      }));
      if (Exit.isFailure(result)) {
        showError("Could not start your session. Please restart the app.");
      }
    })();
  }, [showError]);

  return (
    <SessionStateContext.Provider value={value}>
      <SessionGateContext.Provider value={session}>
        <ApiContext.Provider value={api}>
          <KeysContext.Provider value={keys}>
            <HapticsContext.Provider value={haptics}>{children}</HapticsContext.Provider>
          </KeysContext.Provider>
        </ApiContext.Provider>
      </SessionGateContext.Provider>
    </SessionStateContext.Provider>
  );
};

/** The session for screens; only valid inside the gate. */
export const useGateSession = (): SessionService | null => useContext(SessionGateContext);

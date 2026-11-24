import { Context, Effect, Exit, Layer, Schema, Stream, SubscriptionRef } from "effect";

import { buildClient, MobileApiError } from "@api/client";
import { mobileRoutes } from "@api/routes";
import type { MobileMe } from "@api/routes-account";

import {
  fromMobileApiError,
  Unauthenticated,
  ValidationFailed,
  type AppFailure,
} from "@/errors";
import type { LifecycleState } from "@/services/app-lifecycle";
import { TokenSource } from "@/services/mobile-api";
import { SecureStorage } from "@/services/secure-storage";

const TOKEN_KEY = "session-token";

const TokenCodec = Schema.String;

export type SessionState =
  | { readonly kind: "anonymous" }
  | { readonly kind: "authenticated"; readonly token: string; readonly me: MobileMe };

export type SessionService = Session["Service"];

export interface SignInInput {
  readonly email: string;
  readonly password: string;
}

export class Session extends Context.Service<
  Session,
  {
    /** Emits every session change, starting with the current state. */
    readonly changes: Stream.Stream<SessionState>;
    readonly current: Effect.Effect<SessionState>;
    /** Exchanges credentials for a token, loads /me and persists the token. */
    readonly signIn: (input: SignInInput) => Effect.Effect<SessionState, AppFailure>;
    /** Restores the stored token, validating it against /me. */
    readonly restore: Effect.Effect<SessionState, AppFailure>;
    /** Changes the signed-in account's password, then reloads /me. */
    readonly changeOwnPassword: (input: {
      readonly currentPassword: string;
      readonly newPassword: string;
    }) => Effect.Effect<void, AppFailure>;
    /** Revokes the server session and clears local state. */
    readonly signOut: Effect.Effect<void, Error>;
    /**
     * Clears local state without a server call (used on a 401 cascade), but
     * only while `token` is still the current session: a late 401 for an older
     * token never signs out a newer session.
     */
    readonly invalidate: (token: string) => Effect.Effect<void, AppFailure>;
    /**
     * Runs forever: signs a client-role session out after `idle` in the
     * background. Staff sessions are never timed out.
     */
    readonly watchClientIdle: (
      lifecycleChanges: Stream.Stream<LifecycleState>,
      idle: Parameters<typeof Effect.sleep>[0],
    ) => Effect.Effect<never, Error | AppFailure>;
  }
>()("taskora/mobile/Session") {}

export interface SessionDeps {
  readonly baseUrl: string;
  readonly fetchImpl?: typeof fetch;
}

const ANONYMOUS: SessionState = { kind: "anonymous" };

type AuthenticatedSession = Extract<SessionState, { kind: "authenticated" }>;

// A rejected password change keeps the server's reason next to the field.
const passwordFailure = (error: unknown): AppFailure =>
  error instanceof MobileApiError && error.code === "VALIDATION_FAILED" && error.fieldErrors === undefined
    ? new ValidationFailed({ fieldErrors: { currentPassword: error.message } })
    : fromMobileApiError(error);

const headValue = <A>(stream: Stream.Stream<A>): Effect.Effect<A, never> =>
  Effect.flatMap(Stream.runHead(stream), (head) =>
    head._tag === "Some" ? Effect.succeed(head.value) : Effect.never,
  );

const makeSession = (deps: SessionDeps) =>
  Effect.gen(function* () {
    const storage = yield* Effect.service(SecureStorage);
    const ref = yield* SubscriptionRef.make<SessionState>(ANONYMOUS);

    const client = (token: string) =>
      buildClient(mobileRoutes, {
        baseUrl: deps.baseUrl,
        ...(deps.fetchImpl === undefined ? {} : { fetch: deps.fetchImpl }),
        token,
      });

    const persist = (token: string) => storage.write(TOKEN_KEY, token, TokenCodec);

    const clear = Effect.andThen(SubscriptionRef.set(ref, ANONYMOUS), storage.remove(TOKEN_KEY));

    const isCurrent = (state: SessionState, token: string): boolean =>
      state.kind === "authenticated" && state.token === token;

    const clearIfCurrent = (token: string) =>
      Effect.flatMap(
        SubscriptionRef.modify(ref, (state): [boolean, SessionState] =>
          isCurrent(state, token) ? [true, ANONYMOUS] : [false, state],
        ),
        (cleared) => (cleared ? storage.remove(TOKEN_KEY) : Effect.void),
      );

    const authenticated = (token: string, me: MobileMe): SessionState => ({
      kind: "authenticated",
      me,
      token,
    });

    const fetchMe = (token: string) =>
      Effect.tryPromise({
        catch: (error) => fromMobileApiError(error),
        try: () => client(token).getMe(),
      });

    const become = (token: string, me: MobileMe) =>
      Effect.as(SubscriptionRef.set(ref, authenticated(token, me)), authenticated(token, me));

    const loadMe = (token: string) => Effect.flatMap(fetchMe(token), (me) => become(token, me));

    // Re-reads /me for the session that is still current, e.g. after the
    // server cleared mustChangePassword.
    const reloadMe = (token: string) =>
      Effect.flatMap(fetchMe(token), (me) =>
        SubscriptionRef.update(ref, (state) => (isCurrent(state, token) ? authenticated(token, me) : state)),
      );

    const revokeOnServer = (token: string) =>
      Effect.flatMap(Effect.tryPromise({
            catch: () => new Error("Could not revoke the server session. You have been signed out on this device."),
            try: () =>
              (deps.fetchImpl ?? fetch)(`${deps.baseUrl}/api/auth/sign-out`, {
                headers: { authorization: `Bearer ${token}` },
                method: "POST",
              }),
          }), (response) => response.ok
            ? Effect.void
            : Effect.fail(new Error("Could not revoke the server session. You have been signed out on this device.")));

    const session = Session.of({
      changes: SubscriptionRef.changes(ref),
      current: SubscriptionRef.get(ref),
      invalidate: clearIfCurrent,
      restore: Effect.flatMap(
        storage.read(TOKEN_KEY, TokenCodec),
        (token) =>
          token === null || token.length === 0
            ? Effect.succeed(ANONYMOUS)
            : Effect.catchEager(loadMe(token), (failure): Effect.Effect<never, AppFailure> =>
                failure._tag === "Unauthenticated"
                  ? Effect.andThen(clear, Effect.fail(failure))
                  : Effect.fail(failure),
              ),
      ),
      signIn: (input) =>
        Effect.flatMap(
          Effect.tryPromise({
            catch: (error) => fromMobileApiError(error),
            try: async () => {
              const response = await (deps.fetchImpl ?? fetch)(
                `${deps.baseUrl}/api/auth/sign-in/email`,
                {
                  body: JSON.stringify({ email: input.email, password: input.password }),
                  headers: { "content-type": "application/json" },
                  method: "POST",
                },
              );
              return response.headers.get("set-auth-token") ?? "";
            },
          }),
          (token) =>
            token.length === 0
              ? Effect.fail(fromMobileApiError(new Error("sign-in rejected")))
              : // /me first, then storage, then the state: storage never holds
                // a token /me refused, and the state never runs ahead of storage.
                Effect.flatMap(fetchMe(token), (me) => Effect.flatMap(persist(token), () => become(token, me))),
        ),
      changeOwnPassword: (input) =>
        Effect.flatMap(SubscriptionRef.get(ref), (state) =>
          state.kind === "authenticated"
            ? Effect.flatMap(
                Effect.tryPromise({
                  catch: passwordFailure,
                  try: () => client(state.token).changePassword({ body: input }),
                }),
                // The server cleared mustChangePassword; reload /me so the
                // router leaves the change-password screen.
                () => reloadMe(state.token),
              )
            : Effect.fail(new Unauthenticated()),
        ),
      signOut: Effect.gen(function* () {
        const state = yield* SubscriptionRef.get(ref);
        const revocation = yield* Effect.exit(
          state.kind === "authenticated" ? revokeOnServer(state.token) : Effect.void,
        );
        yield* SubscriptionRef.set(ref, ANONYMOUS);
        yield* Effect.mapError(storage.remove(TOKEN_KEY), () =>
          new Error("Could not remove the saved session from this device."),
        );
        if (Exit.isFailure(revocation)) {
          return yield* Effect.fail(new Error("Could not revoke the server session. You have been signed out on this device."));
        }
      }),
      watchClientIdle: (lifecycleChanges, idle) =>
        Effect.forever(
          Effect.gen(function* () {
            const state = yield* headValue(
              Stream.filter(
                SubscriptionRef.changes(ref),
                (candidate): candidate is AuthenticatedSession =>
                  candidate.kind === "authenticated" && candidate.me.role === "client",
              ),
            );
            yield* headValue(Stream.filter(lifecycleChanges, (change) => change === "background"));
            // Whoever completes first decides: the idle timeout signs the
            // client out, returning to the foreground just restarts the wait.
            yield* Effect.race(
              Effect.as(Effect.sleep(idle), "timeout" as const),
              Effect.as(headValue(Stream.filter(lifecycleChanges, (c) => c === "active")), "active" as const),
            ).pipe(
              Effect.flatMap((outcome) =>
                outcome === "timeout"
                  ? Effect.gen(function* () {
                      const revocation = yield* Effect.exit(revokeOnServer(state.token));
                      yield* clearIfCurrent(state.token);
                      if (Exit.isFailure(revocation)) {
                        return yield* Effect.fail(new Error("Could not revoke the server session. You have been signed out on this device."));
                      }
                    })
                  : Effect.void,
              ),
            );
          }),
        ),
    });

    return session;
  });

/** The live layer; the native SecureStorage import stays deferred. */
export const makeSessionLayer = (deps: SessionDeps): Layer.Layer<Session, never, SecureStorage> =>
  Layer.effect(Session, makeSession(deps));

/** Adapts the session into the TokenSource the MobileApi service consumes. */
export const TokenSourceFromSession: Layer.Layer<TokenSource, never, Session> = Layer.effect(
  TokenSource,
  Effect.map(Effect.service(Session), (session) =>
    TokenSource.of({
      currentToken: Effect.map(session.current, (state) =>
        state.kind === "authenticated" ? state.token : null,
      ),
      onUnauthenticated: (token) => session.invalidate(token),
    }),
  ),
);

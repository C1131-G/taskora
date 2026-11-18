import { it } from "@effect/vitest";
import { Effect, Layer, SubscriptionRef } from "effect";
import { TestClock } from "effect/testing";
import { expect } from "vitest";

import { makeAppLifecycleTest } from "@/services/app-lifecycle";
import { SecureStorage } from "@/services/secure-storage";
import { makeStoreOps, memoryStorageAdapter } from "@/services/storage-adapter";
import { makeSessionLayer, Session } from "@/services/session";

const ME = {
  clientCompanyId: "client-1",
  id: "user-1",
  mustChangePassword: false,
  name: "Client Carl",
  role: "client" as const,
  timeZone: "Asia/Kolkata",
};

const STAFF_ME = { ...ME, clientCompanyId: null, name: "Ada Staff", role: "employee" as const };

const jsonResponse = (status: number, body: unknown, headers: Record<string, string> = {}) =>
  Promise.resolve(
    new Response(JSON.stringify(body), {
      headers: { "content-type": "application/json", ...headers },
      status,
    }),
  );

const fetchImpl = ((input: Request | string | URL, init?: RequestInit) => {
  const url = String(input);
  if (url.endsWith("/api/auth/sign-in/email")) {
    return jsonResponse(200, { user: ME }, { "set-auth-token": "token-new" });
  }
  if (url.endsWith("/api/v1/me/password")) {
    const body = JSON.parse(String(init?.body ?? "{}")) as { currentPassword?: string };
    return body.currentPassword === "old-pass"
      ? jsonResponse(200, { data: { changed: true }, ok: true, requestId: "r" })
      : jsonResponse(400, {
          error: { code: "VALIDATION_FAILED", message: "Wrong current password", requestId: "r" },
          ok: false,
        });
  }
  if (url.endsWith("/api/auth/sign-out")) {
    return jsonResponse(200, { ok: true });
  }
  if (url.endsWith("/api/v1/me")) {
    const auth = new Request(url, init).headers.get("authorization") ?? "";
    return auth === "Bearer token-new"
      ? jsonResponse(200, { data: ME, ok: true, requestId: "r" })
      : jsonResponse(200, { data: STAFF_ME, ok: true, requestId: "r" });
  }
  return jsonResponse(404, { ok: false });
}) as typeof fetch;

const storageLayer = (seedToken: string | null): Layer.Layer<SecureStorage> =>
  Layer.effect(
    SecureStorage,
    Effect.sync(() => {
      const adapter = memoryStorageAdapter();
      if (seedToken !== null) {
        adapter.data.set("session-token", seedToken);
      }
      return SecureStorage.of(makeStoreOps(adapter));
    }),
  );

const sessionLayer = (seedToken: string | null) =>
  Layer.provide(makeSessionLayer({ baseUrl: "https://unit.test", fetchImpl }), storageLayer(seedToken));

it.effect("signs in, persists the token and exposes the me payload", () =>
  Effect.gen(function* () {
    const session = yield* Effect.service(Session);

    const state = yield* session.signIn({ email: "c@taskora.test", password: "secret" });

    expect(state.kind).toBe("authenticated");
    expect(state.kind === "authenticated" ? state.me.role : null).toBe("client");
    expect(state.kind === "authenticated" ? state.token : null).toBe("token-new");
  }).pipe(Effect.provide(sessionLayer(null))),
);

it.effect("restore validates a stored token and reports anonymous without one", () =>
  Effect.gen(function* () {
    const staffSession = yield* Effect.service(Session);
    const restored = yield* staffSession.restore;

    expect(restored.kind).toBe("authenticated");
    expect(restored.kind === "authenticated" ? restored.me.role : null).toBe("employee");

    const anonSession = yield* Effect.service(Session).pipe(
      Effect.provide(sessionLayer(null)),
    );
    const anonymous = yield* anonSession.restore;

    expect(anonymous.kind).toBe("anonymous");
  }).pipe(Effect.provide(sessionLayer("token-stored"))),
);

it.effect("reports a session storage read failure", () =>
  Effect.gen(function* () {
    const session = yield* Effect.service(Session);
    const error = yield* Effect.flip(session.restore);
    expect(error._tag).toBe("StorageFailure");
    expect((yield* session.current).kind).toBe("anonymous");
  }).pipe(
    Effect.provide(Layer.provide(makeSessionLayer({ baseUrl: "https://unit.test", fetchImpl }),
      Layer.succeed(SecureStorage, SecureStorage.of(makeStoreOps({
        ...memoryStorageAdapter(),
        getItem: () => Promise.reject(new Error("storage unavailable")),
      }))),
    )),
  ),
);

it.effect("keeps the stored token when session validation fails temporarily", () =>
  Effect.gen(function* () {
    const adapter = memoryStorageAdapter(new Map([["session-token", "token-stored"]]));
    const session = yield* Effect.service(Session).pipe(Effect.provide(
      Layer.provide(makeSessionLayer({
        baseUrl: "https://unit.test",
        fetchImpl: (() => Promise.reject(new Error("network unavailable"))) as typeof fetch,
      }), Layer.succeed(SecureStorage, SecureStorage.of(makeStoreOps(adapter)))),
    ));
    const error = yield* Effect.flip(session.restore);
    expect(error._tag).toBe("Unavailable");
    expect(adapter.data.get("session-token")).toBe("token-stored");
  }),
);

it.effect("sign out revokes the server session and clears state", () =>
  Effect.gen(function* () {
    const session = yield* Effect.service(Session);
    yield* session.signIn({ email: "c@taskora.test", password: "secret" });

    yield* session.signOut;

    expect((yield* session.current).kind).toBe("anonymous");
  }).pipe(Effect.provide(sessionLayer(null))),
);

it.effect("reports a rejected sign out while still clearing the local session", () =>
  Effect.gen(function* () {
    const session = yield* Effect.service(Session);
    yield* session.signIn({ email: "c@taskora.test", password: "secret" });
    const error = yield* Effect.flip(session.signOut);
    expect(error.message).toContain("Could not revoke the server session");
    expect((yield* session.current).kind).toBe("anonymous");
  }).pipe(
    Effect.provide(Layer.provide(makeSessionLayer({
      baseUrl: "https://unit.test",
      fetchImpl: ((input, init) => String(input).endsWith("/api/auth/sign-out")
        ? jsonResponse(503, { ok: false })
        : fetchImpl(input, init)) as typeof fetch,
    }), storageLayer(null))),
  ),
);

it.effect("reports an inability to save the sign-in token", () =>
  Effect.gen(function* () {
    const session = yield* Effect.service(Session);
    const error = yield* Effect.flip(session.signIn({ email: "c@taskora.test", password: "secret" }));
    expect(error._tag).toBe("StorageFailure");
    expect((yield* session.current).kind).toBe("anonymous");
  }).pipe(
    Effect.provide(Layer.provide(makeSessionLayer({ baseUrl: "https://unit.test", fetchImpl }),
      Layer.succeed(SecureStorage, SecureStorage.of(makeStoreOps({
        ...memoryStorageAdapter(),
        setItem: () => Promise.reject(new Error("storage unavailable")),
      }))),
    )),
  ),
);

it.effect("reports an inability to remove the saved token on sign out", () =>
  Effect.gen(function* () {
    const session = yield* Effect.service(Session);
    yield* session.signIn({ email: "c@taskora.test", password: "secret" });
    const error = yield* Effect.flip(session.signOut);
    expect(error.message).toContain("Could not remove the saved session");
    expect((yield* session.current).kind).toBe("anonymous");
  }).pipe(
    Effect.provide(Layer.provide(makeSessionLayer({ baseUrl: "https://unit.test", fetchImpl }),
      Layer.succeed(SecureStorage, SecureStorage.of(makeStoreOps({
        ...memoryStorageAdapter(),
        removeItem: () => Promise.reject(new Error("storage unavailable")),
      }))),
    )),
  ),
);

it.effect("reports storage failure when invalidating a session", () =>
  Effect.gen(function* () {
    const session = yield* Effect.service(Session);
    yield* session.signIn({ email: "c@taskora.test", password: "secret" });
    const current = yield* session.current;
    const error = yield* Effect.flip(session.invalidate(current.kind === "authenticated" ? current.token : ""));
    expect(error._tag).toBe("StorageFailure");
    expect((yield* session.current).kind).toBe("anonymous");
  }).pipe(
    Effect.provide(Layer.provide(makeSessionLayer({ baseUrl: "https://unit.test", fetchImpl }),
      Layer.succeed(SecureStorage, SecureStorage.of(makeStoreOps({
        ...memoryStorageAdapter(),
        removeItem: () => Promise.reject(new Error("storage unavailable")),
      }))),
    )),
  ),
);

it.effect("signs a client out after the idle timeout in the background", () =>
  Effect.scoped(
    Effect.gen(function* () {
      const lifecycle = yield* makeAppLifecycleTest();
      const session = yield* Effect.service(Session);
      yield* session.signIn({ email: "c@taskora.test", password: "secret" });
      yield* SubscriptionRef.set(lifecycle.ref, "background");

      yield* Effect.forkScoped(session.watchClientIdle(lifecycle.changes, "2 hours"));

      yield* TestClock.adjust("119 minutes");
      expect((yield* session.current).kind).toBe("authenticated");

      yield* TestClock.adjust("1 minute");
      expect((yield* session.current).kind).toBe("anonymous");
    }),
  ).pipe(Effect.provide(sessionLayer(null))),
);

it.effect("keeps a client signed in when the app returns to the foreground", () =>
  Effect.scoped(
    Effect.gen(function* () {
      const lifecycle = yield* makeAppLifecycleTest();
      const session = yield* Effect.service(Session);
      yield* session.signIn({ email: "c@taskora.test", password: "secret" });
      yield* SubscriptionRef.set(lifecycle.ref, "background");

      yield* Effect.forkScoped(session.watchClientIdle(lifecycle.changes, "2 hours"));

      yield* TestClock.adjust("1 hour");
      yield* SubscriptionRef.set(lifecycle.ref, "active");
      yield* TestClock.adjust("3 hours");

      expect((yield* session.current).kind).toBe("authenticated");
    }),
  ).pipe(Effect.provide(sessionLayer(null))),
);

it.effect("never times out a staff session", () =>
  Effect.scoped(
    Effect.gen(function* () {
      const lifecycle = yield* makeAppLifecycleTest();
      const session = yield* Effect.service(Session);
      // token-stored maps to the staff /me response in the stub.
      yield* session.restore;
      yield* SubscriptionRef.set(lifecycle.ref, "background");

      yield* Effect.forkScoped(session.watchClientIdle(lifecycle.changes, "2 hours"));

      yield* TestClock.adjust("5 hours");

      expect((yield* session.current).kind).toBe("authenticated");
    }),
  ).pipe(Effect.provide(sessionLayer("token-stored"))),
);

it.effect("changes the password and surfaces the server field error", () =>
  Effect.gen(function* () {
    const session = yield* Effect.service(Session);
    yield* session.signIn({ email: "c@taskora.test", password: "secret" });

    yield* session.changeOwnPassword({ currentPassword: "old-pass", newPassword: "new-pass" });

    const error = yield* Effect.flip(
      session.changeOwnPassword({ currentPassword: "wrong", newPassword: "new-pass" }),
    );

    expect(error._tag).toBe("ValidationFailed");
    expect("fieldErrors" in error && error.fieldErrors).toEqual({
      currentPassword: "Wrong current password",
    });
  }).pipe(Effect.provide(sessionLayer(null))),
);

it.effect("reports an unreadable refusal as unavailable, not as a field error", () =>
  Effect.gen(function* () {
    const session = yield* Effect.service(Session);
    yield* session.signIn({ email: "c@taskora.test", password: "secret" });

    const error = yield* Effect.flip(
      session.changeOwnPassword({ currentPassword: "wrong", newPassword: "new-pass" }),
    );

    expect(error._tag).toBe("Unavailable");
  }).pipe(
    Effect.provide(
      Layer.provide(
        makeSessionLayer({
          baseUrl: "https://unit.test",
          fetchImpl: ((input: Request | string | URL, init?: RequestInit) =>
            String(input).endsWith("/api/v1/me/password")
              ? Promise.resolve(new Response("<html>bad gateway</html>", { status: 502 }))
              : fetchImpl(input, init)) as typeof fetch,
        }),
        storageLayer(null),
      ),
    ),
  ),
);

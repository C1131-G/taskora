import { it } from "@effect/vitest";
import { Effect, Layer } from "effect";
import { expect } from "vitest";

import { SecureStorage } from "@/services/secure-storage";
import { makeSessionLayer, Session } from "@/services/session";
import { makeStoreOps, memoryStorageAdapter } from "@/services/storage-adapter";

const ME = {
  clientCompanyId: null,
  id: "user-1",
  mustChangePassword: true,
  name: "Ada Staff",
  role: "employee" as const,
  timeZone: null,
};

const json = (status: number, body: unknown, headers: Record<string, string> = {}) =>
  Promise.resolve(
    new Response(JSON.stringify(body), { headers: { "content-type": "application/json", ...headers }, status }),
  );

// A small server: sign-in hands out a fresh token each time, /me reflects the
// server's mustChangePassword flag, and /me/password clears it.
const makeServer = (options: { readonly meFails?: boolean } = {}) => {
  const server = { mustChangePassword: true, signIns: 0 };
  const fetchImpl = ((input: Request | string | URL) => {
    const url = String(input);
    if (url.endsWith("/api/auth/sign-in/email")) {
      server.signIns += 1;
      return json(200, {}, { "set-auth-token": `token-${server.signIns}` });
    }
    if (url.endsWith("/api/auth/sign-out")) {
      return json(200, { ok: true });
    }
    if (url.endsWith("/api/v1/me/password")) {
      server.mustChangePassword = false;
      return json(200, { data: { changed: true }, ok: true, requestId: "r" });
    }
    if (url.endsWith("/api/v1/me")) {
      return options.meFails === true
        ? json(503, { error: { code: "UNAVAILABLE", message: "down", requestId: "r" }, ok: false })
        : json(200, { data: { ...ME, mustChangePassword: server.mustChangePassword }, ok: true, requestId: "r" });
    }
    return json(404, { ok: false });
  }) as typeof fetch;
  return { fetchImpl, server };
};

const sessionWith = (fetchImpl: typeof fetch) => {
  const adapter = memoryStorageAdapter();
  const layer = Layer.provide(
    makeSessionLayer({ baseUrl: "https://unit.test", fetchImpl }),
    Layer.succeed(SecureStorage, SecureStorage.of(makeStoreOps(adapter))),
  );
  return { adapter, layer };
};

it.effect("a forced password change reloads /me so the user leaves change-password", () => {
  const { fetchImpl } = makeServer();
  const { layer } = sessionWith(fetchImpl);
  return Effect.gen(function* () {
    const session = yield* Effect.service(Session);
    const before = yield* session.signIn({ email: "a@taskora.test", password: "secret" });
    expect(before.kind === "authenticated" && before.me.mustChangePassword).toBe(true);

    yield* session.changeOwnPassword({ currentPassword: "temporary-pass", newPassword: "brand-new-pass" });

    const after = yield* session.current;
    expect(after.kind === "authenticated" && after.me.mustChangePassword).toBe(false);
  }).pipe(Effect.provide(layer));
});

it.effect("a late 401 for an older token does not sign out the newer session", () => {
  const { fetchImpl } = makeServer();
  const { adapter, layer } = sessionWith(fetchImpl);
  return Effect.gen(function* () {
    const session = yield* Effect.service(Session);
    yield* session.signIn({ email: "a@taskora.test", password: "secret" });
    yield* session.signOut;
    yield* session.signIn({ email: "a@taskora.test", password: "secret" });

    yield* session.invalidate("token-1");
    const kept = yield* session.current;
    expect(kept.kind === "authenticated" ? kept.token : null).toBe("token-2");
    expect(adapter.data.get("session-token")).toBe("token-2");

    yield* session.invalidate("token-2");
    expect((yield* session.current).kind).toBe("anonymous");
    expect(adapter.data.has("session-token")).toBe(false);
  }).pipe(Effect.provide(layer));
});

it.effect("a sign-in whose /me fails stores no token", () => {
  const { fetchImpl } = makeServer({ meFails: true });
  const { adapter, layer } = sessionWith(fetchImpl);
  return Effect.gen(function* () {
    const session = yield* Effect.service(Session);
    const error = yield* Effect.flip(session.signIn({ email: "a@taskora.test", password: "secret" }));
    expect(error._tag).toBe("Unavailable");
    expect((yield* session.current).kind).toBe("anonymous");
    expect(adapter.data.has("session-token")).toBe(false);
  }).pipe(Effect.provide(layer));
});

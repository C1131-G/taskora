import { screen, waitFor } from "@testing-library/react-native";
import { useQuery, useQueryClient, type QueryClient } from "@tanstack/react-query";
import { Text } from "react-native";
import { Effect, Layer, ManagedRuntime } from "effect";

import { SessionGate, useGateSession, useSessionState } from "@/features/auth/session-gate";
import { AppLifecycle, makeAppLifecycleTest } from "@/services/app-lifecycle";
import { Connectivity, makeConnectivityTest } from "@/services/connectivity";
import { makeHapticsStub } from "@/services/haptics";
import { makeIdempotencyKeys } from "@/services/idempotency-keys";
import { makeMobileApiLayer } from "@/services/mobile-api";
import { SecureStorage } from "@/services/secure-storage";
import { makeSessionLayer, TokenSourceFromSession, type SessionService } from "@/services/session";
import { makeStoreOps, memoryStorageAdapter } from "@/services/storage-adapter";
import { renderWithTheme } from "../components/support/theme";

const ME = {
  clientCompanyId: null,
  id: "user-1",
  mustChangePassword: false,
  name: "Ada Staff",
  role: "employee",
  timeZone: null,
};

const meFetch: typeof fetch = async (input) =>
  String(input).endsWith("/api/v1/me")
    ? new Response(JSON.stringify({ data: ME, ok: true, requestId: "r" }), {
        headers: { "content-type": "application/json" },
        status: 200,
      })
    : new Response("{}", { status: 404 });

const storage = Layer.succeed(
  SecureStorage,
  SecureStorage.of(makeStoreOps(memoryStorageAdapter(new Map([["session-token", "token-stored"]])))),
);
const sessionLayer = Layer.provide(makeSessionLayer({ baseUrl: "https://unit.test", fetchImpl: meFetch }), storage);
const tokenLayer = Layer.provide(TokenSourceFromSession, sessionLayer);
const mockRuntime = ManagedRuntime.make(
  Layer.mergeAll(
    makeHapticsStub(),
    makeIdempotencyKeys(),
    sessionLayer,
    tokenLayer,
    Layer.provide(makeMobileApiLayer({ baseUrl: "https://unit.test" }), tokenLayer),
    Layer.effect(AppLifecycle, Effect.map(makeAppLifecycleTest(), (service) => service)),
    Layer.effect(Connectivity, Effect.map(makeConnectivityTest(), (service) => service)),
  ),
);

jest.mock("@/runtime/runtime", () => ({ appRuntime: () => mockRuntime }));

let client: QueryClient | null = null;
let session: SessionService | null = null;

const Probe = () => {
  client = useQueryClient();
  session = useGateSession();
  // An observer keeps the entry alive past the test client's gcTime of 0.
  useQuery({ enabled: false, queryFn: () => "", queryKey: ["private"] });
  const { state } = useSessionState();
  return <Text>{`session:${state.kind}`}</Text>;
};

it("clears the query cache when the session goes anonymous", async () => {
  await renderWithTheme(
    <SessionGate>
      <Probe />
    </SessionGate>,
  );
  await waitFor(() => expect(screen.getByText("session:authenticated")).toBeTruthy());

  client?.setQueryData(["private"], "first user's data");
  expect(client?.getQueryData(["private"])).toBe("first user's data");

  if (session !== null) await mockRuntime.runPromise(session.invalidate("token-stored"));
  await waitFor(() => expect(screen.getByText("session:anonymous")).toBeTruthy());

  expect(client?.getQueryData(["private"])).toBeUndefined();
});

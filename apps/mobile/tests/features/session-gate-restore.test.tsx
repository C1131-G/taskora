import { act, screen, waitFor } from "@testing-library/react-native";
import { Text } from "react-native";
import { Effect, Layer, ManagedRuntime } from "effect";

import { SessionGate, useSessionState } from "@/features/auth/session-gate";
import { AppLifecycle, makeAppLifecycleTest } from "@/services/app-lifecycle";
import { makeHapticsStub } from "@/services/haptics";
import { makeIdempotencyKeys } from "@/services/idempotency-keys";
import { makeMobileApiLayer } from "@/services/mobile-api";
import { SecureStorage } from "@/services/secure-storage";
import { makeSessionLayer, TokenSourceFromSession } from "@/services/session";
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

// /me answers only when the test releases it, so the restore is visibly slow.
let releaseMe: () => void = () => undefined;
const meAnswered = new Promise<void>((resolve) => {
  releaseMe = resolve;
});
const gatedFetch: typeof fetch = async (input) => {
  if (String(input).endsWith("/api/v1/me")) {
    await meAnswered;
    return new Response(JSON.stringify({ data: ME, ok: true, requestId: "r" }), {
      headers: { "content-type": "application/json" },
      status: 200,
    });
  }
  return new Response("{}", { status: 404 });
};

const storage = Layer.succeed(
  SecureStorage,
  SecureStorage.of(makeStoreOps(memoryStorageAdapter(new Map([["session-token", "token-stored"]])))),
);
const sessionLayer = Layer.provide(
  makeSessionLayer({ baseUrl: "https://unit.test", fetchImpl: gatedFetch }),
  storage,
);
const tokenLayer = Layer.provide(TokenSourceFromSession, sessionLayer);
const mockRuntime = ManagedRuntime.make(
  Layer.mergeAll(
    makeHapticsStub(),
    makeIdempotencyKeys(),
    sessionLayer,
    tokenLayer,
    Layer.provide(makeMobileApiLayer({ baseUrl: "https://unit.test" }), tokenLayer),
    Layer.effect(AppLifecycle, Effect.map(makeAppLifecycleTest(), (service) => service)),
  ),
);

jest.mock("@/runtime/runtime", () => ({ appRuntime: () => mockRuntime }));

const Probe = () => {
  const { restored, state } = useSessionState();
  return <Text>{`gate:${String(restored)}:${state.kind}`}</Text>;
};

it("stays unrestored until the stored session is validated, then shows it at once", async () => {
  await renderWithTheme(
    <SessionGate>
      <Probe />
    </SessionGate>,
  );

  // While /me is in flight the gate must not report a finished, anonymous restore.
  await act(() => new Promise((resolve) => setTimeout(resolve, 50)));
  expect(screen.getByText("gate:false:anonymous")).toBeTruthy();
  expect(screen.queryByText("gate:true:anonymous")).toBeNull();

  releaseMe();
  await waitFor(() => expect(screen.getByText("gate:true:authenticated")).toBeTruthy());
});

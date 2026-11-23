import { Layer } from "effect";

import { makeApiLayer, resolveApiMode } from "@/api/api-mode";

import type { AppLifecycle } from "@/services/app-lifecycle";
import { AppLifecycleLive } from "@/services/app-lifecycle";
import type { Connectivity } from "@/services/connectivity";
import { ConnectivityLive } from "@/services/connectivity";
import type { IdempotencyKeys } from "@/services/idempotency-keys";
import { makeIdempotencyKeys } from "@/services/idempotency-keys";
import type { Haptics } from "@/services/haptics";
import { HapticsLive } from "@/services/haptics";
import type { MobileApi, TokenSource } from "@/services/mobile-api";
import { SecureStorageLive } from "@/services/secure-storage";
import type { Session } from "@/services/session";
import { makeSessionLayer, TokenSourceFromSession } from "@/services/session";
import type { ThemePreferences } from "@/services/theme-preferences";
import { ThemePreferencesServiceLive } from "@/services/theme-preferences";
import { KeyValueStoreLive } from "@/services/key-value-store";

/**
 * The app origin. Development builds, and hybrid builds that still use mocks for
 * pending routes, fall back to 10.0.2.2, which the Android emulator uses to
 * reach the host machine. A live release build has no such host: it needs
 * EXPO_PUBLIC_API_URL (an EAS environment variable). Without it the app points
 * at a reserved .invalid address, so requests fail as "unavailable" instead of
 * trying an emulator-only cleartext address, and the problem is logged.
 */
const UNCONFIGURED_ORIGIN = "https://api.invalid";

const resolveBaseUrl = (): string => {
  const configured = process.env.EXPO_PUBLIC_API_URL;
  if (configured !== undefined && configured.length > 0) {
    return configured;
  }
  if (__DEV__ || resolveApiMode(process.env.EXPO_PUBLIC_API_MODE) !== "live") {
    return "http://10.0.2.2:3000";
  }
  console.error("EXPO_PUBLIC_API_URL is not set for this build profile; API calls will fail.");
  return UNCONFIGURED_ORIGIN;
};

const SessionLive = Layer.provide(
  makeSessionLayer({ baseUrl: resolveBaseUrl() }),
  SecureStorageLive,
);
const TokenSourceLive = Layer.provide(TokenSourceFromSession, SessionLive);
const MobileApiLive = Layer.provide(
  makeApiLayer(resolveApiMode(process.env.EXPO_PUBLIC_API_MODE), resolveBaseUrl()),
  TokenSourceLive,
);
const IdempotencyKeysLive = makeIdempotencyKeys();
const ThemePreferencesLive = Layer.provide(
  ThemePreferencesServiceLive,
  KeyValueStoreLive,
);

/** Every service the app runtime provides. */
export const AppLive = Layer.mergeAll(
  HapticsLive,
  IdempotencyKeysLive,
  SessionLive,
  TokenSourceLive,
  MobileApiLive,
  ThemePreferencesLive,
  ConnectivityLive,
  AppLifecycleLive,
);

export type AppServices =
  | Haptics
  | IdempotencyKeys
  | Session
  | TokenSource
  | MobileApi
  | ThemePreferences
  | Connectivity
  | AppLifecycle;

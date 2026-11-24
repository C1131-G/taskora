import { ManagedRuntime } from "effect";

import { makeBridge, type Bridge } from "./bridge";
import { AppLive, type AppServices } from "./app-layer";

export type AppRuntime = ManagedRuntime.ManagedRuntime<AppServices, never>;

const makeAppRuntime = (): AppRuntime => ManagedRuntime.make(AppLive);

let runtimeRef: AppRuntime | undefined;
let bridgeRef: Bridge | undefined;

/** The app's single runtime, built once on first use so tests never build the native layers. */
export const appRuntime = (): AppRuntime => {
  runtimeRef ??= makeAppRuntime();
  return runtimeRef;
};

/** The app's single React bridge, bound to the app runtime. */
const bridge = (): Bridge => {
  bridgeRef ??= makeBridge(appRuntime());
  return bridgeRef;
};

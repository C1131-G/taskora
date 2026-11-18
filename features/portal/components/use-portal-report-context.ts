import { useSyncExternalStore } from "react";

import {
  contextServerSnapshot,
  contextSnapshot,
  parseContext,
  subscribeToContext,
} from "@/features/portal/portal-context-store";
import {
  environmentServerSnapshot,
  environmentSnapshot,
  parseEnvironment,
} from "@/features/portal/portal-environment";

import { noSubscription } from "./portal-bug-form-mode";

// What the browser says about the page and the device, read once per render
// without a mismatch between the server and the first client render.
export const usePortalReportContext = () => {
  const context = parseContext(
    useSyncExternalStore(
      subscribeToContext,
      contextSnapshot,
      contextServerSnapshot
    )
  );
  const detected = parseEnvironment(
    useSyncExternalStore(
      noSubscription,
      environmentSnapshot,
      environmentServerSnapshot
    )
  );
  return { context, detected };
};

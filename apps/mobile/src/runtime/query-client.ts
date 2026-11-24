import { isCancelledError, QueryClient, useQueryClient } from "@tanstack/react-query";
import { useEffect } from "react";

import { useErrorToast } from "@/components/workspace/error-toast-context";
import { failureMessage } from "@/components/workspace/workspace-error-state";
import type { AppFailure } from "@/errors";

/** Reads stay fresh this long before a mount, focus or reconnect refetches them. */
const QUERY_STALE_TIME = 30_000;

/** Retries after the first failure, for transient failures only. */
const MAX_QUERY_RETRIES = 2;

// Only a failure the next attempt can fix is worth retrying; the 4xx-type
// answers (and local decode or storage faults) fail the same way again.
const isTransient = (failure: AppFailure): boolean => {
  switch (failure._tag) {
    case "Offline":
    case "Unavailable":
      return true;
    case "Conflict":
    case "DecodeFailure":
    case "Forbidden":
    case "NotFound":
    case "RateLimited":
    case "StorageFailure":
    case "Unauthenticated":
    case "ValidationFailed":
      return false;
  }
};

export const shouldRetryQuery = (failureCount: number, failure: AppFailure): boolean =>
  failureCount < MAX_QUERY_RETRIES && isTransient(failure);

/** The app's QueryClient defaults. */
export const makeQueryClient = (): QueryClient =>
  new QueryClient({
    defaultOptions: {
      queries: { retry: shouldRetryQuery, staleTime: QUERY_STALE_TIME },
    },
  });

/**
 * Toasts a query failure once, and only when the query already had data:
 * a failed background refresh keeps the cached data on screen, so the
 * toast is the only signal. First-load failures render each screen's
 * inline error state instead.
 *
 * The toast lives in React context below the QueryClientProvider, so this
 * subscribes to the query cache from inside the providers rather than
 * setting QueryCache's onError when the client is built. The cache emits
 * the error action once per fetch, after the retries are spent.
 */
export const useBackgroundRefreshToasts = (): void => {
  const queryClient = useQueryClient();
  const showError = useErrorToast();

  useEffect(
    function toastFailedBackgroundRefreshes() {
      return queryClient.getQueryCache().subscribe((event) => {
        if (event.type !== "updated" || event.action.type !== "error") return;
        const failure = event.action.error;
        if (isCancelledError(failure) || event.query.state.data === undefined) return;
        showError(failureMessage(failure));
      });
    },
    [queryClient, showError],
  );
};

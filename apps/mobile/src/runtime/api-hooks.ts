import { Cause, Effect, Exit, Option } from "effect";
import { createContext, useContext } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";

import { Unavailable, type AppFailure } from "@/errors";
import type { MobileApi } from "@/services/mobile-api";
import type { IdempotencyKeys } from "@/services/idempotency-keys";

type MobileApiService = MobileApi["Service"];

export const ApiContext = createContext<MobileApiService | null>(null);

export const KeysContext = createContext<IdempotencyKeys["Service"] | null>(null);

export const useKeys = (): IdempotencyKeys["Service"] | null => useContext(KeysContext);

/** The MobileApi from the nearest provider, or null outside one. */
export const useApi = (): MobileApiService | null => useContext(ApiContext);

export type ApiContextValue = MobileApiService;
export type KeysContextValue = NonNullable<IdempotencyKeys["Service"]>;

export const failureOf = <A>(
  exit: Exit.Exit<A, AppFailure> | undefined,
): AppFailure | undefined =>
  exit === undefined || Exit.isSuccess(exit)
    ? undefined
    : Option.getOrUndefined(Cause.findErrorOption(exit.cause));

export interface ApiQueryInput<A> {
  readonly enabled?: boolean;
  readonly program: Effect.Effect<A, AppFailure>;
  readonly queryKey: readonly unknown[];
}

/**
 * Runs one Effect program as a TanStack query; rejections are AppFailure.
 * TanStack's abort signal interrupts the program when the query is
 * cancelled. Failures are not toasted here: screens show first-load
 * failures inline and the QueryClient toasts failed background refreshes.
 */
export const useApiQuery = <A>({ enabled, program, queryKey }: ApiQueryInput<A>) =>
  useQuery<A, AppFailure>({
    enabled: enabled ?? true,
    queryFn: async ({ signal }) => {
      const exit = await Effect.runPromiseExit(program, { signal });
      if (Exit.isSuccess(exit)) return exit.value;
      return Promise.reject(failureOf(exit) ?? new Unavailable({ requestId: "" }));
    },
    queryKey,
  });

export interface ApiMutationInput<V, A> {
  readonly program: (variables: V) => Effect.Effect<A, AppFailure>;
}

/** Runs one Effect program as a TanStack mutation; data is the Exit. */
export const useApiMutation = <V, A>({ program }: ApiMutationInput<V, A>) =>
  useMutation({
    mutationFn: (variables: V) => Effect.runPromiseExit(program(variables)),
  });

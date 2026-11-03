import { Cause, Effect, Exit, Option } from "effect";
import { createContext, useContext } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";

import { Unavailable, type AppFailure } from "@/errors";
import { useErrorToast } from "@/components/workspace/error-toast-context";
import { failureMessage } from "@/components/workspace/workspace-error-state";
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

/** Runs one Effect program as a TanStack query; rejections are AppFailure. */
export const useApiQuery = <A>({ enabled, program, queryKey }: ApiQueryInput<A>) => {
  const showError = useErrorToast();
  return useQuery<A, AppFailure>({
    enabled: enabled ?? true,
    queryFn: async () => {
      const exit = await Effect.runPromiseExit(program);
      if (Exit.isSuccess(exit)) return exit.value;
      const failure = failureOf(exit) ?? new Unavailable({ requestId: "" });
      showError(failureMessage(failure));
      return Promise.reject(failure);
    },
    queryKey,
  });
};

export interface ApiMutationInput<V, A> {
  readonly program: (variables: V) => Effect.Effect<A, AppFailure>;
}

/** Runs one Effect program as a TanStack mutation; data is the Exit. */
export const useApiMutation = <V, A>({ program }: ApiMutationInput<V, A>) =>
  useMutation({
    mutationFn: (variables: V) => Effect.runPromiseExit(program(variables)),
  });

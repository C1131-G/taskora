import { Cause, Effect, Exit, Option } from "effect";
import { createContext, useContext } from "react";
import {
  useInfiniteQuery,
  useMutation,
  useQuery,
  useQueryClient,
  type InfiniteData,
} from "@tanstack/react-query";

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

export interface ApiInfiniteQueryInput<Page> {
  readonly enabled?: boolean;
  /** Loads one page; `cursor` is undefined for the first. */
  readonly program: (cursor: string | undefined) => Effect.Effect<Page, AppFailure>;
  readonly queryKey: readonly unknown[];
}

/**
 * Cursor-paged variant of useApiQuery: each page runs as an Effect with the
 * query's abort signal, and the next cursor is the last page's `nextCursor`.
 */
export const useApiInfiniteQuery = <Page extends { readonly nextCursor: string | null }>({
  enabled,
  program,
  queryKey,
}: ApiInfiniteQueryInput<Page>) =>
  useInfiniteQuery<Page, AppFailure, InfiniteData<Page, string | undefined>, readonly unknown[], string | undefined>({
    enabled: enabled ?? true,
    getNextPageParam: (last) => last.nextCursor ?? undefined,
    initialPageParam: undefined,
    queryFn: async ({ pageParam, signal }) => {
      const exit = await Effect.runPromiseExit(program(pageParam), { signal });
      if (Exit.isSuccess(exit)) return exit.value;
      return Promise.reject(failureOf(exit) ?? new Unavailable({ requestId: "" }));
    },
    queryKey,
  });

export interface ApiMutationInput<V, A> {
  /**
   * Query key prefixes refreshed after a successful write. The mutation stays
   * pending until they settle, so a screen never reads stale data on success.
   */
  readonly invalidates?: readonly (readonly unknown[])[];
  readonly mutationKey?: readonly unknown[];
  /**
   * Called once per failed write, even when several writes of one screen are
   * in flight (per-call `mutate` callbacks only fire for the latest call).
   * `failure` is undefined when the program died instead of failing.
   */
  readonly onError?: (failure: AppFailure | undefined, variables: V) => void;
  /** Called once per write after success or failure, once any refresh has settled. */
  readonly onSettled?: (variables: V) => void;
  /** Called once per successful write, after the invalidations settle. */
  readonly onSuccess?: (data: A, variables: V) => void;
  readonly program: (variables: V) => Effect.Effect<A, AppFailure>;
}

/**
 * Runs one Effect program as a TanStack mutation; rejections are the
 * AppFailure (undefined for a defect). Success invalidates `invalidates`
 * before it resolves; haptics, toasts and navigation belong to the callers.
 */
export const useApiMutation = <V, A>({
  invalidates,
  mutationKey,
  onError,
  onSettled,
  onSuccess,
  program,
}: ApiMutationInput<V, A>) => {
  const queryClient = useQueryClient();

  return useMutation<A, AppFailure | undefined, V>({
    ...(mutationKey === undefined ? {} : { mutationKey }),
    mutationFn: async (variables) => {
      const exit = await Effect.runPromiseExit(program(variables));
      if (Exit.isSuccess(exit)) return exit.value;
      return Promise.reject(failureOf(exit));
    },
    onError: (failure, variables) => onError?.(failure, variables),
    onSettled: (_data, _failure, variables) => onSettled?.(variables),
    onSuccess: async (data, variables) => {
      await Promise.all((invalidates ?? []).map((queryKey) => queryClient.invalidateQueries({ queryKey })));
      onSuccess?.(data, variables);
    },
  });
};

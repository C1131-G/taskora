"use client";

import { WarningCircle } from "@phosphor-icons/react";
import Link from "next/link";
import {
  useEffect,
  useEffectEvent,
  useId,
  useSyncExternalStore,
  useTransition,
} from "react";

import { buttonVariants } from "@/components/ui/button";
import { ErrorToast } from "@/components/workspace/error-toast";

type ErrorStateProps = {
  readonly homeHref?: "/" | "/portal" | undefined;
  readonly retry: () => void;
  readonly title: string;
  readonly variant?: "page" | "section" | undefined;
};

// Several boundaries on one page can fail at once (for example the header and
// the body). Only the first one mounted draws the recovery card; its button
// retries all of them.
const failed = new Map<string, { retry: () => void; variant: "page" | "section" }>();
const listeners = new Set<() => void>();
const notify = () => {
  for (const listener of listeners) {
    listener();
  }
};
const subscribe = (listener: () => void) => {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
};
export const ErrorState = ({ homeHref, retry, title, variant = "section" }: ErrorStateProps) => {
  const [pending, startTransition] = useTransition();
  const id = useId();
  const retryLatest = useEffectEvent(() => retry());
  const primaryId = useSyncExternalStore(
    subscribe,
    () => [...failed].find(([, state]) => state.variant === "page")?.[0] ?? null,
    () => null
  );
  useEffect(
    function registerFailedBoundary() {
      failed.set(id, { retry: () => retryLatest(), variant });
      notify();
      return function unregisterFailedBoundary() {
        failed.delete(id);
        notify();
      };
    },
    [id, variant]
  );
  if (variant === "page" && primaryId !== null && primaryId !== id) {
    return null;
  }
  const Heading = variant === "page" ? "h1" : "h2";

  return (
    <section
      aria-label={variant === "page" ? "Page recovery" : "Section recovery"}
      className={`mx-auto flex w-full max-w-xl flex-col items-center gap-6 rounded-xl border border-border bg-card p-6 text-center text-card-foreground shadow-sm sm:p-8 ${
        variant === "page" ? "min-h-[55vh] justify-center py-10" : "py-12"
      }`}
    >
      <ErrorToast message={title} />
      <span className="flex size-16 items-center justify-center rounded-md border border-destructive/30 bg-destructive/10 text-destructive">
        <WarningCircle aria-hidden="true" size={32} weight="duotone" />
      </span>
      <div className="grid gap-2">
        <Heading className="font-heading text-xl font-semibold tracking-tight">
          {title}
        </Heading>
        <p className="text-sm leading-relaxed text-muted-foreground">
          {homeHref
            ? "This page hit a problem. Try again, or head back home."
            : "This section hit a problem. Try loading it again."}
        </p>
      </div>
      <div className="flex flex-wrap justify-center gap-3">
        <button
          aria-busy={pending || undefined}
          className={buttonVariants({ className: "min-w-28 rounded-sm", size: "lg" })}
          disabled={pending}
          onClick={() =>
            startTransition(() => {
              for (const state of failed.values()) {
                if (state.variant === variant) {
                  state.retry();
                }
              }
            })
          }
          type="button"
        >
          {pending ? "Retrying…" : "Try again"}
        </button>
        {homeHref && (
          <Link
            className={buttonVariants({
              className: "min-w-28 rounded-sm",
              size: "lg",
              variant: "outline",
            })}
            href={homeHref}
          >
            Go to home
          </Link>
        )}
      </div>
    </section>
  );
};

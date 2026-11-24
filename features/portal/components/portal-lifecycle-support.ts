"use client";

import { useRef, useState } from "react";
import { toast } from "sonner";

export type Satisfaction = "up" | "down";

export const COMMENT_MAX = 2000;
export const REPLY_MAX = 10_000;

const conflictMessage =
  "This bug changed while you were looking at it. Reload the page and try again.";

interface ActionFailure {
  readonly error: { readonly code: string; readonly message: string };
}

const failureText = (failure: ActionFailure) =>
  failure.error.code === "CONFLICT" ? conflictMessage : failure.error.message;

// Shared state for a one-shot action: busy flag, visible error, and an
// idempotency key that is reused on retry until the input changes.
export const useLifecycleAction = () => {
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");
  const showError = (message: string) => {
    setError(message);
    if (message) {
      toast.error(message);
    }
  };
  const keyRef = useRef<string | null>(null);

  const touch = () => {
    keyRef.current = null;
    setError("");
  };

  const run = async (
    call: (
      idempotencyKey: string
    ) => Promise<{ ok: true } | ({ ok: false } & ActionFailure)>,
    fallback: string
  ) => {
    setPending(true);
    setError("");
    if (!keyRef.current) {
      keyRef.current = crypto.randomUUID();
    }
    try {
      const result = await call(keyRef.current);
      if (result.ok) {
        keyRef.current = null;
        setPending(false);
        return true;
      }
      showError(failureText(result));
    } catch {
      showError(fallback);
    }
    setPending(false);
    return false;
  };

  return { error, pending, run, setError: showError, touch };
};

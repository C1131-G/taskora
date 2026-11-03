"use client";

import { useEffect, useId, useRef } from "react";
import { toast } from "sonner";

// Error toasts on screen. A new one replaces the previous so that several
// failures at once show a single message instead of a stack.
const activeErrorToasts = new Set<string>();

// Shows an error message as a toast instead of inline text. Render it where the
// message used to be: `<ErrorToast message={error} />`. It draws nothing itself
// and toasts again only when the message changes (a repeated failure with the
// same text is shown again because `resetKey` changes or the message was cleared
// in between). Pass `message={null}` to show nothing.
const ErrorToast = ({
  message,
  resetKey,
  action,
}: {
  readonly message: string | null | undefined;
  // Change this (for example a counter or timestamp) to toast the same text again.
  readonly resetKey?: string | number;
  // An optional button on the toast, for example "Retry" or "Reload task".
  readonly action?:
    | { readonly label: string; readonly onClick: () => void }
    | undefined;
}) => {
  const actionLabel = action?.label;
  const onAction = action?.onClick;
  const baseId = useId();
  const toastId = `${baseId}-${resetKey ?? ""}`;
  const onActionRef = useRef(onAction);
  useEffect(() => {
    onActionRef.current = onAction;
  }, [onAction]);
  useEffect(() => {
    if (message) {
      for (const other of activeErrorToasts) {
        if (other !== toastId) {
          toast.dismiss(other);
          activeErrorToasts.delete(other);
        }
      }
      activeErrorToasts.add(toastId);
      toast.error(message, {
        id: toastId,
        ...(actionLabel
          ? {
              action: {
                label: actionLabel,
                onClick: () => onActionRef.current?.(),
              },
              duration: Infinity,
            }
          : {}),
      });
    } else {
      toast.dismiss(toastId);
      activeErrorToasts.delete(toastId);
    }
    return () => {
      toast.dismiss(toastId);
      activeErrorToasts.delete(toastId);
    };
  }, [message, actionLabel, toastId]);
  return null;
};

export { ErrorToast };

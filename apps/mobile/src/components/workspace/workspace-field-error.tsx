import { useEffect } from "react";

import { type AppFailure } from "@/errors";
import { useErrorToast } from "@/components/workspace/error-toast-provider";
import { failureMessage } from "@/components/workspace/workspace-error-state";

export interface WorkspaceFieldErrorProps {
  readonly failure?: AppFailure | undefined;
  /** The form field whose message to show; omitted shows the first message. */
  readonly field?: string;
}

/** Renders the ValidationFailed field errors; other failures render nothing. */
export const WorkspaceFieldError = ({ failure, field }: WorkspaceFieldErrorProps) => {
  const showError = useErrorToast();
  const fieldErrors = failure?._tag === "ValidationFailed" ? failure.fieldErrors : {};
  const message =
    failure !== undefined && failure._tag !== "ValidationFailed"
      ? failureMessage(failure)
      : field === undefined
      ? (Object.values(fieldErrors)[0] ?? null)
      : (fieldErrors[field] ?? null);
  useEffect(() => {
    if (message !== null) showError(message);
  }, [message, showError]);
  return null;
};

import { useEffect } from "react";

import { Match } from "effect";

import { WorkspaceButton } from "@/components/workspace/workspace-button";
import { useErrorToast } from "@/components/workspace/error-toast-provider";
import { type AppFailure } from "@/errors";

export interface WorkspaceErrorStateProps {
  readonly failure: AppFailure;
  readonly onRetry?: () => void;
}

/** Renders a tag-specific message for any AppFailure, with optional retry. */
export const failureMessage = (failure: AppFailure): string =>
  Match.valueTags(failure, {
    Unauthenticated: () => "Your session ended. Sign in again.",
    Forbidden: () => "You do not have permission to do that.",
    NotFound: () => "This item no longer exists.",
    ValidationFailed: (error) =>
      Object.values(error.fieldErrors).join(". ") || "Some details need fixing.",
    Conflict: () => "Someone else changed this item. Reload to continue.",
    RateLimited: () => "Too many attempts. Wait a moment and retry.",
    Unavailable: () => "The service is temporarily unavailable. Try again.",
    Offline: () => "You appear to be offline. Reconnect and retry.",
    StorageFailure: () => "This device could not access saved data.",
    DecodeFailure: () => "Some saved or server data could not be read.",
  });

export const WorkspaceErrorState = ({ failure, onRetry }: WorkspaceErrorStateProps) => {
  const showError = useErrorToast();
  const message = failureMessage(failure);

  useEffect(() => {
    showError(message);
  }, [message, showError]);

  return onRetry === undefined ? null : (
        <WorkspaceButton onPress={onRetry} size="sm" variant="secondary">
          Try again
        </WorkspaceButton>
  );
};

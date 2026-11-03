import type { ErrorBoundaryProps } from "expo-router";
import { Effect } from "effect";
import { useEffect } from "react";
import { View } from "react-native";

import { useErrorToast } from "@/components/workspace/error-toast-context";
import { ErrorToastProvider } from "@/components/workspace/error-toast-provider";
import { WorkspaceButton } from "@/components/workspace/workspace-button";

const RouteFailure = ({ retry }: Pick<ErrorBoundaryProps, "retry">) => {
  const showError = useErrorToast();
  useEffect(() => {
    showError("Something went wrong. Please try again.");
  }, [showError]);
  return (
    <View style={{ alignItems: "center", flex: 1, justifyContent: "center" }}>
      <WorkspaceButton onPress={() => void Effect.runPromise(Effect.catchEager(
        Effect.tryPromise({ try: retry, catch: () => new Error("Retry failed") }),
        () => Effect.sync(() => showError("Could not reload the screen. Please try again.")),
      ))}>
        Try again
      </WorkspaceButton>
    </View>
  );
};

export const ErrorBoundary = ({ retry }: ErrorBoundaryProps) => (
  <ErrorToastProvider>
    <RouteFailure retry={retry} />
  </ErrorToastProvider>
);

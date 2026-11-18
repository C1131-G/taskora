import { Cause, Effect, Exit, Option } from "effect";
import { useEffect, useState } from "react";
import { StyleSheet, View } from "react-native";
import { useMutation } from "@tanstack/react-query";

import { WorkspaceButton } from "@/components/workspace/workspace-button";
import { WorkspaceField } from "@/components/workspace/workspace-field";
import { useErrorToast } from "@/components/workspace/error-toast-provider";
import { failureMessage } from "@/components/workspace/workspace-error-state";
import { WorkspaceScreen } from "@/components/workspace/workspace-screen";
import { WorkspaceTextInput } from "@/components/workspace/workspace-text-input";
import { type AppFailure } from "@/errors";
import type { SessionService } from "@/services/session";

import { useGateSession } from "./session-gate";

const failureOf = (exit: Exit.Exit<unknown, AppFailure> | undefined): AppFailure | undefined =>
  exit === undefined || Exit.isSuccess(exit)
    ? undefined
    : Option.getOrUndefined(Cause.findErrorOption(exit.cause));

interface PasswordChange {
  readonly currentPassword: string;
  readonly newPassword: string;
  readonly service: SessionService;
}

export interface ChangePasswordScreenProps {
  readonly onDone: () => void;
  readonly session?: SessionService;
}

/** The forced (or voluntary) password change; the session stays signed in. */
export const ChangePasswordScreen = ({ onDone, session: sessionProp }: ChangePasswordScreenProps) => {
  const gateSession = useGateSession();
  const session = sessionProp ?? gateSession;
  const showError = useErrorToast();
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  const change = useMutation({
    mutationFn: ({ service, ...input }: PasswordChange) =>
      Effect.runPromiseExit(service.changeOwnPassword(input)),
    onSuccess: (result) => {
      const failure = failureOf(result);
      if (failure !== undefined) showError(failureMessage(failure));
      else if (Exit.isFailure(result)) showError("Could not change your password. Please try again.");
    },
    onError: () => showError("Could not change your password. Please try again."),
  });

  const submit = (): void => {
    const errors: Record<string, string> = {};
    if (currentPassword.length === 0) {
      errors.currentPassword = "Enter your current password";
    }
    if (newPassword.length < 8) {
      errors.newPassword = "New password needs at least 8 characters";
    }
    if (confirm !== newPassword) {
      errors.confirm = "The passwords do not match";
    }
    setFieldErrors(errors);
    if (Object.keys(errors).length > 0) showError(Object.values(errors).join(". "));
    if (Object.keys(errors).length > 0 || session === null) {
      return;
    }
    change.mutate({ currentPassword, newPassword, service: session });
  };

  const succeeded = change.data !== undefined && Exit.isSuccess(change.data);
  useEffect(() => {
    if (succeeded) {
      onDone();
    }
  }, [succeeded, onDone]);

  return (
    <WorkspaceScreen title="Change password">
      <View style={styles.form}>
        <WorkspaceField label="Current password">
          <WorkspaceTextInput
            invalid={fieldErrors.currentPassword !== undefined}
            onChangeText={setCurrentPassword}
            secureTextEntry
            value={currentPassword}
          />
        </WorkspaceField>
        <WorkspaceField label="New password">
          <WorkspaceTextInput
            invalid={fieldErrors.newPassword !== undefined}
            onChangeText={setNewPassword}
            secureTextEntry
            value={newPassword}
          />
        </WorkspaceField>
        <WorkspaceField label="Repeat new password">
          <WorkspaceTextInput
            invalid={fieldErrors.confirm !== undefined}
            onChangeText={setConfirm}
            secureTextEntry
            value={confirm}
          />
        </WorkspaceField>
        <WorkspaceButton disabled={session === null || change.isPending} onPress={submit}>
          {change.isPending ? "Saving" : "Save new password"}
        </WorkspaceButton>
      </View>
    </WorkspaceScreen>
  );
};

const styles = StyleSheet.create({
  form: {
    gap: 12,
    paddingTop: 12,
  },
});

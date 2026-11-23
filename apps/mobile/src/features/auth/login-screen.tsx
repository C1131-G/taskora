import { Cause, Effect, Exit, Option } from "effect";
import { createContext, useContext, useRef, useState } from "react";
import { StyleSheet, type TextInputInstance, View } from "react-native";
import { useMutation } from "@tanstack/react-query";

import { WorkspaceButton } from "@/components/workspace/workspace-button";
import { WorkspaceField } from "@/components/workspace/workspace-field";
import { useErrorToast } from "@/components/workspace/error-toast-provider";
import { failureMessage } from "@/components/workspace/workspace-error-state";
import { WorkspaceScreen } from "@/components/workspace/workspace-screen";
import { WorkspaceTextInput } from "@/components/workspace/workspace-text-input";
import { type AppFailure } from "@/errors";
import type { SessionService } from "@/services/session";

export interface Credentials {
  readonly email: string;
  readonly password: string;
}

/** Client-side field checks; the server remains authoritative. */
export const validateCredentials = (
  values: Credentials,
):
  | { readonly ok: true; readonly values: Credentials }
  | { readonly ok: false; readonly errors: Record<string, string> } => {
  const email = values.email.trim();
  const errors: Record<string, string> = {};
  if (email.length < 3) {
    errors.email = "Enter your email";
  }
  if (values.password.length < 8) {
    errors.password = "Password needs at least 8 characters";
  }
  return Object.keys(errors).length === 0
    ? { ok: true, values: { email, password: values.password } }
    : { ok: false, errors };
};

export const SessionContext = createContext<SessionService | null>(null);

/** The session from the nearest provider, or null outside one. */
export const useSession = (): SessionService | null => useContext(SessionContext);

const failureOf = (exit: Exit.Exit<unknown, AppFailure> | undefined): AppFailure | undefined =>
  exit === undefined || Exit.isSuccess(exit)
    ? undefined
    : Option.getOrUndefined(Cause.findErrorOption(exit.cause));

interface SignInRequest {
  readonly credentials: Credentials;
  readonly service: SessionService;
}

export interface LoginScreenProps {
  readonly session?: SessionService;
}

/** The sign-in screen; the route gate reacts to the session it mutates. */
export const LoginScreen = ({ session: sessionProp }: LoginScreenProps) => {
  const contextSession = useSession();
  const session = sessionProp ?? contextSession;
  const showError = useErrorToast();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const passwordRef = useRef<TextInputInstance>(null);

  const signIn = useMutation({
    mutationFn: ({ service, credentials }: SignInRequest) =>
      Effect.runPromiseExit(service.signIn(credentials)),
    onSuccess: (result) => {
      const failure = failureOf(result);
      if (failure !== undefined) showError(failureMessage(failure));
      else if (Exit.isFailure(result)) showError("Could not sign in. Please try again.");
    },
    onError: () => showError("Could not sign in. Please try again."),
  });

  const submit = (): void => {
    // The keyboard's return key can submit while the button is disabled.
    if (signIn.isPending) {
      return;
    }
    const validated = validateCredentials({ email, password });
    if (!validated.ok) {
      setFieldErrors(validated.errors);
      showError(Object.values(validated.errors).join(". "));
      return;
    }
    setFieldErrors({});
    if (session === null) {
      return;
    }
    signIn.mutate({ credentials: validated.values, service: session });
  };

  return (
    <WorkspaceScreen title="Sign in">
      <View style={styles.form}>
        <WorkspaceField label="Email">
          <WorkspaceTextInput
            autoCapitalize="none"
            autoComplete="email"
            autoCorrect={false}
            invalid={fieldErrors.email !== undefined}
            keyboardType="email-address"
            onChangeText={setEmail}
            onSubmitEditing={() => passwordRef.current?.focus()}
            placeholder="you@taskora.test"
            returnKeyType="next"
            submitBehavior="submit"
            textContentType="username"
            value={email}
          />
        </WorkspaceField>
        <WorkspaceField label="Password">
          <WorkspaceTextInput
            autoCapitalize="none"
            autoComplete="current-password"
            autoCorrect={false}
            invalid={fieldErrors.password !== undefined}
            onChangeText={setPassword}
            onSubmitEditing={submit}
            ref={passwordRef}
            returnKeyType="done"
            secureTextEntry
            textContentType="password"
            value={password}
          />
        </WorkspaceField>
        <WorkspaceButton disabled={session === null || signIn.isPending} onPress={submit}>
          {signIn.isPending ? "Signing in" : "Sign in"}
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

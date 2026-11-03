import { useRouter } from "expo-router";

import { SettingsScreen } from "@/features/workspace/workspace-screens";
import { useGateSession } from "@/features/auth/session-gate";
import { Effect } from "effect";
import { useErrorToast } from "@/components/workspace/error-toast-context";

export default function SettingsRoute() {
  const session = useGateSession();
  const router = useRouter();
  const showError = useErrorToast();

  return (
    <SettingsScreen
      onOpenNotifications={() => router.push("/notification-settings")}
      onSignOut={() => {
        if (session !== null) {
          void Effect.runPromiseExit(Effect.catchEager(session.signOut, (error) => Effect.sync(() => showError(error.message))));
        }
        router.push("/login");
      }}
    />
  );
}

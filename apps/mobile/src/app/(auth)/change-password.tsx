import { ChangePasswordScreen } from "@/features/auth/change-password-screen";
import { useGateSession } from "@/features/auth/session-gate";

// The session reloads /me after a change, so the (auth) layout routes on by
// itself; there is nothing left to do here when the change is done.
const noFollowUp = (): void => undefined;

export default function ChangePasswordRoute() {
  const session = useGateSession();

  return <ChangePasswordScreen onDone={noFollowUp} session={session} />;
}

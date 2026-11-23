import { SessionContext } from "@/features/auth/login-screen";
import { LoginScreen } from "@/features/auth/login-screen";
import { useGateSession } from "@/features/auth/session-gate";

export default function LoginRoute() {
  const session = useGateSession();

  return (
    <SessionContext value={session}>
      <LoginScreen />
    </SessionContext>
  );
}

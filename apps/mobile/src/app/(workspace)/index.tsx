import { HomeScreen } from "@/features/workspace/workspace-screens";
import { useSessionState } from "@/features/auth/session-gate";
import { useApi } from "@/runtime/api-hooks";

export default function HomeRoute() {
  const api = useApi();
  const { state } = useSessionState();
  const authenticated = state.kind === "authenticated";

  // Until the session is ready the home screen renders in its loading state,
  // inside the same tab shell, so nothing jumps when it resolves.
  return <HomeScreen api={authenticated ? api : null} name={authenticated ? state.me.name : undefined} />;
}

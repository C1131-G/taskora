import { Redirect, Stack } from "expo-router";

import { usePrefersReducedMotion } from "@/components/workspace/workspace-reveal-gate";
import { WorkspaceLoadingSurface } from "@/components/workspace/workspace-loading";
import { routeFor } from "@/features/auth/route-for";
import { useSessionState } from "@/features/auth/session-gate";

/** The bottom-tab routes (navigation-data mobileTabs): peers, so they never slide. */
const TAB_ROUTES = ["index", "my-tasks", "inbox"] as const;

/** The staff area; clients go to the portal, signed-out users to sign-in. */
export default function WorkspaceLayout() {
  const { restored, state } = useSessionState();
  const reducedMotion = usePrefersReducedMotion();
  const area = routeFor(state);

  if (!restored) {
    return <WorkspaceLoadingSurface />;
  }
  if (area !== "workspace") {
    return <Redirect href={area === "portal" ? "/portal" : "/login"} />;
  }

  // Detail routes keep the platform push; reduced motion swaps it for a fade.
  return (
    <Stack screenOptions={{ animation: reducedMotion ? "fade" : "default", headerShown: false }}>
      {TAB_ROUTES.map((name) => (
        <Stack.Screen key={name} name={name} options={{ animation: "none" }} />
      ))}
    </Stack>
  );
}

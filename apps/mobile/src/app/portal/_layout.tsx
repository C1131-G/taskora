import { Redirect, Stack } from "expo-router";

import { usePrefersReducedMotion } from "@/components/workspace/workspace-reveal-gate";
import { WorkspaceLoadingSurface } from "@/components/workspace/workspace-loading";
import { AREA_HREFS, routeFor } from "@/features/auth/route-for";
import { useSessionState } from "@/features/auth/session-gate";

/** The client area; staff go to the workspace, signed-out users to sign-in. */
export default function PortalLayout() {
  const { restored, state } = useSessionState();
  const reducedMotion = usePrefersReducedMotion();
  const area = routeFor(state);

  if (!restored) {
    return <WorkspaceLoadingSurface />;
  }
  if (area !== "portal") {
    return <Redirect href={AREA_HREFS[area]} />;
  }

  return <Stack screenOptions={{ animation: reducedMotion ? "fade" : "default", headerShown: false }} />;
}

import { Redirect, Stack } from "expo-router";

import { WorkspaceLoadingSurface } from "@/components/workspace/workspace-loading";
import { routeFor } from "@/features/auth/route-for";
import { useSessionState } from "@/features/auth/session-gate";

/** The client area; staff go to the workspace, signed-out users to sign-in. */
export default function PortalLayout() {
  const { restored, state } = useSessionState();
  const area = routeFor(state);

  if (!restored) {
    return <WorkspaceLoadingSurface />;
  }
  if (area !== "portal") {
    return <Redirect href={area === "workspace" ? "/" : "/login"} />;
  }

  return <Stack screenOptions={{ headerShown: false }} />;
}

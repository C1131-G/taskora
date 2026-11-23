import { Redirect, Stack, useSegments } from "expo-router";

import { WorkspaceLoadingSurface } from "@/components/workspace/workspace-loading";
import { AREA_HREFS, routeFor } from "@/features/auth/route-for";
import { useSessionState } from "@/features/auth/session-gate";

/** The sign-in group; authenticated users bounce to their area. */
export default function AuthLayout() {
  const { restored, state } = useSessionState();
  const segments = useSegments();
  const area = routeFor(state);
  const screen = segments.at(-1);

  if (!restored) {
    return <WorkspaceLoadingSurface />;
  }
  // Signed-in users leave the group; a user who must change their password
  // stays on that screen, and a signed-out user cannot open it.
  if (area !== "login" && area !== "change-password") {
    return <Redirect href={AREA_HREFS[area]} />;
  }
  // Only while a screen of this group is showing, so a root screen pushed on
  // top (the not-found page) is not pulled back to sign-in.
  if (segments[0] === "(auth)" && screen !== area) {
    return <Redirect href={AREA_HREFS[area]} />;
  }

  return <Stack screenOptions={{ headerShown: false }} />;
}

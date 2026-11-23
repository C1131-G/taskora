import { useRouter } from "expo-router";

import { PortalNewBugScreen } from "@/features/portal/portal-screens";

export default function PortalNewBugRoute() {
  const router = useRouter();

  // Return to where the report started instead of stacking another portal home.
  return (
    <PortalNewBugScreen
      onDone={() => (router.canGoBack() ? router.back() : router.dismissTo("/portal"))}
    />
  );
}

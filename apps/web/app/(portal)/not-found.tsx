import type { Metadata } from "next";

import { NotFoundState } from "@/components/ui/not-found-state";

export const metadata: Metadata = { title: "Not found | Taskora" };

const PortalNotFound = () => (
  <NotFoundState
    description="The link may be wrong, or the page may have moved."
    href="/portal"
    linkText="Go to portal"
    title="Page not found"
  />
);

export default PortalNotFound;

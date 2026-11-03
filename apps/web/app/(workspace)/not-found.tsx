import type { Metadata } from "next";

import { NotFoundState } from "@/components/ui/not-found-state";

export const metadata: Metadata = { title: "Not found | Taskora" };

const WorkspaceNotFound = () => (
  <NotFoundState
    description="The link may be wrong, or the page may have moved."
    href="/"
    linkText="Go to home"
    title="Page not found"
  />
);

export default WorkspaceNotFound;

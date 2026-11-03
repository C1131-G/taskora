import type { Metadata } from "next";

import { NotFoundState } from "@/components/ui/not-found-state";

export const metadata: Metadata = { title: "Not found | Taskora" };

const RootNotFound = () => (
  <main className="grid min-h-dvh place-items-center">
    <NotFoundState
      description="The link may be wrong, or the page may have moved."
      href="/"
      linkText="Go to home"
      title="Page not found"
    />
  </main>
);

export default RootNotFound;

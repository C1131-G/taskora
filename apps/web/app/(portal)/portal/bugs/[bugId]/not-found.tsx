import { NotFoundState } from "@/components/ui/not-found-state";

const PortalBugNotFound = () => (
  <NotFoundState
    description="It may have been withdrawn or is no longer shared with your company."
    href="/portal"
    linkText="Go to company bugs"
    title="Bug report not found"
  />
);

export default PortalBugNotFound;

import { NotFoundState } from "@/components/ui/not-found-state";

const BugNotFound = () => (
  <NotFoundState
    description="The report may have been archived or removed."
    href="/bugs"
    linkText="Go to bugs"
    title="Bug report not found"
  />
);

export default BugNotFound;

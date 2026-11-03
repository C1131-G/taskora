import { NotFoundState } from "@/components/ui/not-found-state";

const TeamNotFound = () => (
  <NotFoundState
    description="The team may have been deleted or you may not have access."
    href="/teams"
    linkText="Go to teams"
    title="Team not found"
  />
);

export default TeamNotFound;

import { NotFoundState } from "@/components/ui/not-found-state";

const MemberNotFound = () => (
  <NotFoundState
    description="The member may have been deactivated or removed."
    href="/members"
    linkText="Go to members"
    title="Member not found"
  />
);

export default MemberNotFound;

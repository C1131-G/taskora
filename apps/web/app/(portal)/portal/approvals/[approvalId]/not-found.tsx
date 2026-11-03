import { NotFoundState } from "@/components/ui/not-found-state";

const PortalApprovalNotFound = () => (
  <NotFoundState
    description="It may have been withdrawn or is no longer shared with your company."
    href="/portal/approvals"
    linkText="Go to approvals"
    title="Approval not found"
  />
);

export default PortalApprovalNotFound;

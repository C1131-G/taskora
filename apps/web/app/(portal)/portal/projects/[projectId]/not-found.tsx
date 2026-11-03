import { NotFoundState } from "@/components/ui/not-found-state";

const PortalProjectNotFound = () => (
  <NotFoundState
    description="It may no longer be shared with your company."
    href="/portal/projects"
    linkText="Go to projects"
    title="Project not found"
  />
);

export default PortalProjectNotFound;

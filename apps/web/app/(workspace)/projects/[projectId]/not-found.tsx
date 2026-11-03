import { NotFoundState } from "@/components/ui/not-found-state";

const ProjectNotFound = () => (
  <NotFoundState
    description="The project may have been archived or removed."
    href="/projects"
    linkText="Go to projects"
    title="Project not found"
  />
);

export default ProjectNotFound;

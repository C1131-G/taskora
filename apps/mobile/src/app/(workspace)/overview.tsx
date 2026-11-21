import { DomainRoute } from "@/features/workspace/domain-route";
import { projectKeys } from "@/runtime/query-keys";
import { projectsOverviewProgram } from "@/features/workspace/overview-program";

export default function Route() {
  return (
    <DomainRoute
      emptyMessage="No projects yet."
      emptyTitle="Overview"
      makeProgram={(api) => projectsOverviewProgram(api)}
      queryKey={projectKeys.overview()}
      screenTitle="Overview"
    />
  );
}

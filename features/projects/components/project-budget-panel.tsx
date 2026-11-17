/* eslint-disable shadcn/no-unknown-classes */

import { SkeletonBone } from "@/components/workspace/skeleton-shapes";
import { SkeletonRegion } from "@/components/workspace/skelter-surface";
import { BudgetBurn } from "@/features/projects/components/budget-burn";
import { ProjectBudgetEditor } from "@/features/projects/components/project-budget-editor";
import { getProjectBudget } from "@/features/projects/projects-queries";
import { readOrThrow } from "@/lib/read-result";

// The hours budget and its burn for one project. People who may not see it
// (clients, employees outside the project) get nothing, not an error.
const ProjectBudgetPanel = async ({
  editable,
  projectId,
}: {
  readonly editable: boolean;
  readonly projectId: string;
}) => {
  const result = await getProjectBudget({ projectId });
  if (!result.ok && result.error.code === "FORBIDDEN") {
    return null;
  }
  const budget = readOrThrow(result, "The budget");
  if (!budget && !editable) {
    return null;
  }
  return (
    <section aria-labelledby={`budget-${projectId}-heading`} className="panel">
      <div className="panel-h">
        <h2 id={`budget-${projectId}-heading`}>Budget</h2>
        {editable ? (
          <ProjectBudgetEditor budget={budget} projectId={projectId} />
        ) : null}
      </div>
      {budget ? (
        <BudgetBurn budget={budget} />
      ) : (
        <p className="muted">No hours budget has been set for this project.</p>
      )}
    </section>
  );
};

// The panel renders nothing for people who may not see the budget, and for
// read-only viewers of a project without one, so only callers that know the
// panel will show (admins, who can always set a budget) reserve its space.
// Reserved space is the common "No hours budget" layout: projects with a budget
// grow by the burn bar and its numbers.
const ProjectBudgetPanelSkeleton = ({
  reserveSpace = true,
}: {
  readonly reserveSpace?: boolean;
}) =>
  reserveSpace ? (
    <SkeletonRegion label="Loading the budget…">
      <section className="panel">
        <div className="panel-h">
          <h2>Budget</h2>
          <span className="btn btn-secondary btn-sm">Set a budget</span>
        </div>
        <p className="muted">
          <SkeletonBone shape="line" width="20em" />
        </p>
      </section>
    </SkeletonRegion>
  ) : null;

export { ProjectBudgetPanel, ProjectBudgetPanelSkeleton };

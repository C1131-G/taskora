/* eslint-disable shadcn/no-unknown-classes -- Workspace classes are defined in apps/web/app/workspace-styles. */

import { CheckCircle } from "@phosphor-icons/react/dist/ssr";
import Link from "next/link";

import { EmptyState } from "@/components/workspace/empty-state";
import type { ProjectTaskListItem } from "@/src/server/work/work-contracts";

type TeamTask = Pick<
  ProjectTaskListItem,
  "assignees" | "id" | "projectId" | "projectTaskNumber" | "status" | "title"
> & {
  readonly projectKey: string;
  readonly projectName: string;
};

const taskStatusLabel: Record<ProjectTaskListItem["status"], string> = {
  backlog: "Backlog",
  done: "Done",
  progress: "In Progress",
  review: "Review",
  todo: "To Do",
};

const TeamOpenTasks = ({ tasks }: { readonly tasks: readonly TeamTask[] }) => {
  const openTasks = tasks.filter((task) => task.status !== "done");
  return (
    <section aria-labelledby="team-open-tasks-heading" className="panel">
      <div className="panel-h team-overview-section-heading">
        <div className="team-section-title">
          <CheckCircle aria-hidden="true" size={18} />
          <h2 id="team-open-tasks-heading">Open tasks</h2>
        </div>
        <span className="ct">{openTasks.length}</span>
      </div>
      {openTasks.length ? (
        <div className="team-open-task-list">
          {openTasks.map((task) => (
            <Link
              className="team-open-task-row"
              href={`/projects/${task.projectId}?view=board`}
              key={task.id}
            >
              <span className="team-task-status" data-task-status={task.status}>
                {taskStatusLabel[task.status]}
              </span>
              <span className="team-task-main">
                <strong>{task.title}</strong>
                <span>
                  {task.projectKey}-{task.projectTaskNumber} ·{" "}
                  {task.projectName}
                </span>
              </span>
              <span className="team-task-assignees">
                {task.assignees.length
                  ? task.assignees.map(({ name }) => name).join(", ")
                  : "Unassigned"}
              </span>
            </Link>
          ))}
        </div>
      ) : (
        <EmptyState
          description="Open tasks assigned to this team's members show here."
          icon={CheckCircle}
          size="compact"
          title="No open tasks"
        />
      )}
    </section>
  );
};

export { TeamOpenTasks };
export type { TeamTask };

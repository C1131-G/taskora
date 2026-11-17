/* eslint-disable shadcn/no-unknown-classes, shadcn/no-restyle */

import { CalendarCheck, UsersThree } from "@phosphor-icons/react/dist/ssr";
import Link from "next/link";

import { Progress } from "@/components/ui/progress";
import { EmptyState } from "@/components/workspace/empty-state";
import {
  SKELETON_KEYS,
  SkeletonBone,
} from "@/components/workspace/skeleton-shapes";
import { SkeletonRegion } from "@/components/workspace/skelter-surface";
import {
  OverviewPortfolioPanel,
  OverviewPortfolioPanelSkeleton,
} from "@/features/dashboard/components/overview-portfolio-panel";
import {
  OverviewStats,
  OverviewStatsSkeleton,
} from "@/features/dashboard/components/overview-stats";
import { getDashboardOverview } from "@/features/dashboard/dashboard-queries";
import {
  milestoneDateFormatter,
  taskStatuses,
} from "@/features/dashboard/overview-labels";
import { ProjectCreateForm } from "@/features/projects/components/project-create-form";
import { listProjects } from "@/features/projects/projects-queries";
import { getPageSession } from "@/src/server/auth/page-session";

const WorkspaceOverview = async () => {
  const [dashboard, projects, session] = await Promise.all([
    getDashboardOverview({}),
    listProjects({}),
    getPageSession(),
  ]);
  const isAdmin =
    session.kind === "authenticated" && session.user.role === "admin";
  if (!dashboard.ok || !projects.ok) {
    throw new Error("Workspace overview could not be loaded.");
  }

  const taskCount = Object.values(dashboard.data.tasks).reduce(
    (sum, count) => sum + count,
    0
  );
  const doneCount = dashboard.data.tasks.done;
  const openTaskCount = taskCount - doneCount;
  const activeProjectCount = projects.data.filter(
    (project) => project.status !== "complete"
  ).length;
  const completedProjectCount = projects.data.filter(
    (project) => project.status === "complete"
  ).length;
  const employees = dashboard.data.workload.toSorted(
    (left, right) => right.openTaskCount - left.openTaskCount
  );
  const employeesById = new Map(
    dashboard.data.workload.map((employee) => [
      employee.employeeId,
      employee.employeeName,
    ])
  );
  const employeesWithTasks = employees
    .filter((employee) => employee.openTaskCount > 0)
    .slice(0, 7);

  return (
    <>
      <OverviewStats
        completedProjects={completedProjectCount}
        completionRate={Math.round((doneCount / Math.max(taskCount, 1)) * 100)}
        members={dashboard.data.workload.length}
        openTasks={openTaskCount}
        projects={activeProjectCount}
        tasks={taskCount}
      />
      <div className="overview-grid ov-layout">
        <OverviewPortfolioPanel
          employeesById={employeesById}
          isAdmin={isAdmin}
          projects={projects.data}
        />
        <section aria-labelledby="overview-status-heading" className="panel">
          <div className="panel-h">
            <h2 id="overview-status-heading">Tasks by status</h2>
          </div>
          <div className="panel-b overview-status-list">
            {taskStatuses.map(([status, label]) => {
              const count = dashboard.data.tasks[status];
              const percentage = Math.round(
                (count / Math.max(taskCount, 1)) * 100
              );
              return (
                <Link
                  className="overview-status-row"
                  href={`/tasks?status=${status}&group=status`}
                  key={status}
                >
                  <span>{label}</span>
                  <Progress
                    aria-label={`${label}: ${count} tasks, ${percentage}%`}
                    data-task-status={status}
                    max={100}
                    value={percentage}
                    workspace
                  />
                  <span className="num">{count}</span>
                  <span className="muted">{percentage}%</span>
                </Link>
              );
            })}
          </div>
        </section>
        <section aria-labelledby="overview-workload-heading" className="panel">
          <div className="panel-h">
            <h2 id="overview-workload-heading">Workload</h2>
          </div>
          <div className="panel-b">
            <p className="muted overview-panel-caption">
              Open tasks per person
            </p>
            {employeesWithTasks.length ? (
              <div className="feed lined">
                {employeesWithTasks.map((employee) => (
                  <Link
                    className="row overview-workload-row"
                    href="/members"
                    key={employee.employeeId}
                  >
                    <span aria-hidden="true" className="av">
                      {employee.employeeName.slice(0, 1)}
                    </span>
                    <span className="trunc grow">{employee.employeeName}</span>
                    <span className="num">{employee.openTaskCount}</span>
                  </Link>
                ))}
              </div>
            ) : (
              <EmptyState
                description="Assign open tasks to see who is carrying the most work."
                icon={UsersThree}
                size="compact"
                title="No assigned open tasks"
              />
            )}
          </div>
        </section>
        <section
          aria-labelledby="overview-milestones-heading"
          className="panel"
        >
          <div className="panel-h">
            <h2 id="overview-milestones-heading">Upcoming milestones</h2>
          </div>
          {dashboard.data.upcomingMilestones.length ? (
            <div className="panel-b feed lined">
              {dashboard.data.upcomingMilestones.map((milestone) => (
                <Link
                  className="row overview-milestone-row"
                  href={`/projects/${milestone.projectId}?view=overview`}
                  key={milestone.id}
                >
                  <span className="trunc grow">{milestone.name}</span>
                  <span className="muted">{milestone.projectName}</span>
                  <time dateTime={milestone.dueDate}>
                    {milestoneDateFormatter.format(
                      new Date(`${milestone.dueDate}T00:00:00Z`)
                    )}
                  </time>
                </Link>
              ))}
            </div>
          ) : (
            <EmptyState
              description="Milestones with a due date show here as they approach."
              icon={CalendarCheck}
              size="compact"
              title="No upcoming milestones"
            />
          )}
        </section>
      </div>
    </>
  );
};

const WorkspaceOverviewActions = async () => {
  const session = await getPageSession();
  const isAdmin =
    session.kind === "authenticated" && session.user.role === "admin";

  return (
    <div className="acts overview-actions">
      <Link className="btn btn-secondary btn-sm" href="/timeline">
        Timeline
      </Link>
      {isAdmin ? <ProjectCreateForm /> : null}
    </div>
  );
};

// Admin-only "New project" is left out: most people do not see it, and it
// only widens the action row.
const WorkspaceOverviewActionsSkeleton = () => (
  <div aria-hidden="true" className="acts overview-actions">
    <span className="btn btn-secondary btn-sm">Timeline</span>
  </div>
);

const OverviewRowsSkeleton = ({
  rowClass,
  withAvatar,
}: {
  readonly rowClass: string;
  readonly withAvatar: boolean;
}) =>
  SKELETON_KEYS.slice(0, 3).map((key) => (
    <div className={`row ${rowClass}`} key={key}>
      {withAvatar ? <span className="av" /> : null}
      <span className="trunc grow">
        <SkeletonBone shape="line" width="9em" />
      </span>
      <span className="num">
        <SkeletonBone shape="line" width="3em" />
      </span>
    </div>
  ));

// The real overview markup: static labels stay, numbers and names are bones.
const WorkspaceOverviewSkeleton = () => (
  <SkeletonRegion label="Loading workspace overview…">
    <OverviewStatsSkeleton />
    <div className="overview-grid ov-layout">
      <OverviewPortfolioPanelSkeleton />
      <section className="panel">
        <div className="panel-h">
          <h2>Tasks by status</h2>
        </div>
        <div className="panel-b overview-status-list">
          {taskStatuses.map(([status, label]) => (
            <span className="overview-status-row" key={status}>
              <span>{label}</span>
              <Progress max={100} value={0} workspace />
              <span className="num">
                <SkeletonBone shape="line" width="2ch" />
              </span>
              <span className="muted">
                <SkeletonBone shape="line" width="3ch" />
              </span>
            </span>
          ))}
        </div>
      </section>
      <section className="panel">
        <div className="panel-h">
          <h2>Workload</h2>
        </div>
        <div className="panel-b">
          <p className="muted overview-panel-caption">Open tasks per person</p>
          <div className="feed lined">
            <OverviewRowsSkeleton rowClass="overview-workload-row" withAvatar />
          </div>
        </div>
      </section>
      <section className="panel">
        <div className="panel-h">
          <h2>Upcoming milestones</h2>
        </div>
        <div className="panel-b feed lined">
          <OverviewRowsSkeleton
            rowClass="overview-milestone-row"
            withAvatar={false}
          />
        </div>
      </section>
    </div>
  </SkeletonRegion>
);

export {
  WorkspaceOverview,
  WorkspaceOverviewActions,
  WorkspaceOverviewActionsSkeleton,
  WorkspaceOverviewSkeleton,
};

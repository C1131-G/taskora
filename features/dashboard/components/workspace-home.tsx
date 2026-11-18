/* eslint-disable shadcn/no-unknown-classes, shadcn/no-inline-styles */

import { Plus } from "@phosphor-icons/react/dist/ssr";
import Link from "next/link";
import { redirect } from "next/navigation";

import { ErrorToast } from "@/components/workspace/error-toast";
import { SkeletonBone } from "@/components/workspace/skeleton-shapes";
import { listActivity } from "@/features/activity/activity-queries";
import {
  HomeStats,
  HomeStatsSkeleton,
  MyTasksPanel,
  MyTasksPanelSkeleton,
  ProjectProgressPanel,
  ProjectProgressPanelSkeleton,
  RecentActivityPanel,
  RecentActivityPanelSkeleton,
  UpcomingDeadlinesPanel,
  UpcomingDeadlinesPanelSkeleton,
} from "@/features/dashboard/components/home-panels";
import type { TaskViewLists } from "@/features/dashboard/components/home-panels";
import { getDashboardOverview } from "@/features/dashboard/dashboard-queries";
import { formatFullDate, greetingAt } from "@/features/dashboard/home-dates";
import type { HomeTaskView } from "@/features/dashboard/home-task-view";
import { listAllEmployees } from "@/features/people/people-queries";
import { ProjectCreateForm } from "@/features/projects/components/project-create-form";
import { listProjects } from "@/features/projects/projects-queries";
import { QuickTaskForm } from "@/features/tasks/components/quick-task-form";
import { listAllProjectTasks } from "@/features/tasks/tasks-queries";
import { getPageSession } from "@/src/server/auth/page-session";
import { isWorkspaceUser } from "@/src/server/auth/session";
import { companyToday } from "@/src/server/budgets/budget-math";
import { getCompanyTimeZone } from "@/src/server/work/work-company-today";
import { isOverdue } from "@/src/server/work/work-overdue";

const HomeTaskViewPanel = ({
  taskView,
  taskViews,
}: {
  readonly taskView: HomeTaskView;
  readonly taskViews: TaskViewLists;
}) => <MyTasksPanel taskView={taskView} taskViews={taskViews} />;

const WorkspaceHome = async ({
  taskView,
}: {
  readonly taskView: HomeTaskView;
}) => {
  const session = await getPageSession();
  if (session.kind === "anonymous") {
    redirect("/login");
  }
  if (session.user.mustChangePassword) {
    redirect("/change-password");
  }
  if (!isWorkspaceUser(session.user)) {
    redirect("/portal");
  }

  const [dashboardResult, projectResult, employeesResult, timeZone] =
    await Promise.all([
      getDashboardOverview({}),
      listProjects({}),
      listAllEmployees(),
      getCompanyTimeZone(),
    ]);
  if (!dashboardResult.ok || !projectResult.ok) {
    throw new Error("Workspace data could not be loaded.");
  }

  const userId = session.user.id;
  const isAdmin = session.user.role === "admin";
  const employee =
    userId && employeesResult.ok
      ? employeesResult.data.find(({ id }) => id === userId)
      : null;
  // eslint-disable-next-line react/purity -- Request-time dashboard dates follow the workspace time zone.
  const now = new Date();
  const dayOf = (date: Date): string => companyToday(date, timeZone);
  const today = dayOf(now);
  const activeProjects = projectResult.data.filter(
    (project) => project.status !== "complete"
  );
  const [projectTasks, activityResults] = await Promise.all([
    Promise.all(
      activeProjects.map(async (project) => ({
        project,
        tasks: await listAllProjectTasks(project.id),
      }))
    ),
    Promise.all(
      activeProjects.map((project) =>
        listActivity({ limit: 7, projectId: project.id })
      )
    ),
  ]);
  if (projectTasks.some(({ tasks }) => tasks === undefined)) {
    throw new Error("Workspace task totals are incomplete.");
  }
  const allTasks = projectTasks.flatMap(({ project, tasks }) =>
    (tasks ?? []).map((task) => ({
      ...task,
      projectColor: project.color,
      projectKey: project.key,
      projectName: project.name,
    }))
  );
  const myTasks = allTasks.filter((task) =>
    task.assigneeIds.includes(userId ?? "")
  );
  const taskViews: TaskViewLists = {
    completed: myTasks.filter((task) => task.status === "done"),
    overdue: myTasks
      .filter((task) => isOverdue(task, today))
      .toSorted((left, right) =>
        (left.dueDate ?? "").localeCompare(right.dueDate ?? "")
      ),
    upcoming: myTasks
      .filter(
        (task) =>
          task.status !== "done" && (!task.dueDate || task.dueDate >= today)
      )
      .toSorted((left, right) =>
        (left.dueDate ?? "9999-12-31").localeCompare(
          right.dueDate ?? "9999-12-31"
        )
      ),
  };
  const openTasks = allTasks.filter((task) => task.status !== "done");
  const completedThisWeek = allTasks.filter(
    (task) =>
      task.completedAt &&
      Date.parse(task.completedAt) >= now.getTime() - 7 * 24 * 60 * 60 * 1000
  );
  const overdueCount = openTasks.filter((task) =>
    isOverdue(task, today)
  ).length;
  const deadlineGroups = [
    {
      name: "Today",
      tasks: openTasks.filter((task) => task.dueDate === today),
    },
    {
      name: "Tomorrow",
      tasks: openTasks.filter(
        (task) => task.dueDate === dayOf(new Date(now.getTime() + 86_400_000))
      ),
    },
    {
      name: "This week",
      tasks: openTasks.filter(
        (task) =>
          task.dueDate !== null &&
          task.dueDate > dayOf(new Date(now.getTime() + 86_400_000)) &&
          task.dueDate <= dayOf(new Date(now.getTime() + 7 * 86_400_000))
      ),
    },
  ];
  if (activityResults.some((result) => !result.ok)) {
    throw new Error("Workspace activity is incomplete.");
  }
  const activities = activityResults
    .flatMap((result) => (result.ok ? result.data : []))
    .toSorted((left, right) => right.createdAt.localeCompare(left.createdAt))
    .slice(0, 7);
  const membersById = new Map(
    employeesResult.ok
      ? employeesResult.data.map((directoryEmployee) => [
          directoryEmployee.id,
          directoryEmployee,
        ])
      : []
  );
  // eslint-disable-next-line react/purity -- This server-rendered date follows the user's workspace time zone.
  const todayLabel = formatFullDate(now);

  return (
    <div className="page">
      <ErrorToast
        message={employeesResult.ok ? null : employeesResult.error.message}
      />
      <div className="ph">
        <div>
          <h1>
            {greetingAt(now)}, {employee?.name.split(" ")[0] ?? "there"}
          </h1>
          <p>{todayLabel} · Here is what is happening across your workspace.</p>
        </div>
        <div className="acts">
          <Link className="btn btn-secondary hide-m" href="/members">
            Invite member
          </Link>
          {isAdmin ? (
            <div className="hide-m">
              <ProjectCreateForm />
            </div>
          ) : null}
          {projectResult.data.length ? (
            <QuickTaskForm
              projects={projectResult.data.map(({ id, name }) => ({
                id,
                name,
              }))}
            />
          ) : null}
        </div>
      </div>
      <HomeStats
        activeProjects={activeProjects.length}
        atRisk={dashboardResult.data.projects.risk}
        assignedTasks={myTasks.filter((task) => task.status !== "done").length}
        completed={completedThisWeek.length}
        openTasks={openTasks.length}
        overdue={overdueCount}
      />
      <div className="grid2 home-columns">
        <div className="stack">
          <HomeTaskViewPanel taskView={taskView} taskViews={taskViews} />
          <ProjectProgressPanel
            projects={activeProjects}
            membersById={membersById}
          />
        </div>
        <div className="stack">
          <UpcomingDeadlinesPanel groups={deadlineGroups} />
          <RecentActivityPanel activities={activities} />
        </div>
      </div>
    </div>
  );
};

// The greeting and date are request data; their line boxes stay so the header
// keeps its loaded height. Admin-only "New project" is left out: most people
// do not see it, and it only widens the action row.
const WorkspaceHomeSkeleton = ({
  taskView,
}: {
  readonly taskView: HomeTaskView;
}) => (
  <div className="page">
    <div className="ph">
      <div>
        <h1>
          <span className="sr-only">Home</span>
          <SkeletonBone shape="line" width="8em" />
        </h1>
        <p>
          <SkeletonBone shape="line" width="13em" /> · Here is what is happening
          across your workspace.
        </p>
      </div>
      <div aria-hidden="true" className="acts" inert>
        <span className="btn btn-secondary hide-m">Invite member</span>
        <span className="btn btn-primary btn-sm">
          <Plus aria-hidden="true" size={14} />
          New task
        </span>
      </div>
    </div>
    <HomeStatsSkeleton />
    <div className="grid2 home-columns">
      <div className="stack">
        <MyTasksPanelSkeleton taskView={taskView} />
        <ProjectProgressPanelSkeleton />
      </div>
      <div className="stack">
        <UpcomingDeadlinesPanelSkeleton />
        <RecentActivityPanelSkeleton />
      </div>
    </div>
  </div>
);

export { WorkspaceHome, WorkspaceHomeSkeleton };

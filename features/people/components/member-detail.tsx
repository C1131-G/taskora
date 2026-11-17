/* eslint-disable shadcn/no-restyle -- Skeletons reuse the real workspace button and input classes. */
/* eslint-disable shadcn/no-unknown-classes -- Workspace classes are defined in apps/web/app/workspace-styles. */

import { Copy, EnvelopeSimple } from "@phosphor-icons/react/dist/ssr";

import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { ErrorToast } from "@/components/workspace/error-toast";
import {
  SKELETON_KEYS,
  SkeletonBone,
} from "@/components/workspace/skeleton-shapes";
import { SkeletonRegion } from "@/components/workspace/skelter-surface";
import { WorkspaceButton } from "@/components/workspace/workspace-button";
import { listActivity } from "@/features/activity/activity-queries";
import {
  MemberProfileHeader,
  MemberProfileWork,
} from "@/features/people/components/member-profile";
import type { MemberTask } from "@/features/people/components/member-profile-task-rows";
import type { MemberTab } from "@/features/people/member-tab";
import {
  getEmployee,
  listAllEmployees,
  listTeams,
} from "@/features/people/people-queries";
import { listProjects } from "@/features/projects/projects-queries";
import { listAllProjectTasks } from "@/features/tasks/tasks-queries";
import { readOrThrow } from "@/lib/read-result";
import { getPageSession } from "@/src/server/auth/page-session";

const MemberHeader = async ({
  employeeId,
}: {
  readonly employeeId: string;
}) => {
  const [employee, projectsResult, teamsResult, session] = await Promise.all([
    getEmployee(employeeId),
    listProjects({}),
    listTeams({}),
    getPageSession(),
  ]);
  return (
    <>
      <ErrorToast
        message={projectsResult.ok ? null : projectsResult.error.message}
      />
      <ErrorToast message={teamsResult.ok ? null : teamsResult.error.message} />
      <MemberProfileHeader
        canManageMembers={
          session.kind === "authenticated" && session.user.role === "admin"
        }
        employee={employee}
        projects={projectsResult.ok ? projectsResult.data : []}
        teams={teamsResult.ok ? teamsResult.data : []}
      />
    </>
  );
};

const byDueDateThenTitle = (left: MemberTask, right: MemberTask) =>
  (left.dueDate ?? "9999-12-31").localeCompare(right.dueDate ?? "9999-12-31") ||
  left.title.localeCompare(right.title);

const MemberWork = async ({
  employeeId,
  tab,
}: {
  readonly employeeId: string;
  readonly tab: MemberTab;
}) => {
  const [employee, employeesResult, projectsResult, session] =
    await Promise.all([
      getEmployee(employeeId),
      listAllEmployees(),
      listProjects({}),
      getPageSession(),
    ]);
  const projects = readOrThrow(projectsResult, "Member projects");
  const [activityResult, projectTaskResults] = await Promise.all([
    listActivity({ actorId: employee.id, limit: 8 }),
    Promise.all(projects.map(({ id }) => listAllProjectTasks(id))),
  ]);
  if (projectTaskResults.some((tasks) => tasks === undefined)) {
    throw new Error("Member work could not be loaded.");
  }

  const projectsById = new Map(
    projects.map((project) => [project.id, project])
  );
  const memberTasks: MemberTask[] = projectTaskResults.flatMap((tasks) =>
    (tasks ?? []).flatMap((task) => {
      if (!task.assigneeIds.includes(employee.id)) {
        return [];
      }
      const project = projectsById.get(task.projectId);
      return project
        ? [{ ...task, projectKey: project.key, projectName: project.name }]
        : [];
    })
  );
  const openTasks = memberTasks
    .filter(({ status }) => status !== "done")
    .toSorted(byDueDateThenTitle);
  const completedTasks = memberTasks
    .filter(({ status }) => status === "done")
    .toSorted((left, right) =>
      (right.completedAt ?? "").localeCompare(left.completedAt ?? "")
    );
  const employees = employeesResult.ok ? employeesResult.data : [];

  return (
    <>
      <ErrorToast
        message={employeesResult.ok ? null : employeesResult.error.message}
      />
      <ErrorToast
        message={activityResult.ok ? null : activityResult.error.message}
      />
      <MemberProfileWork
        activities={activityResult.ok ? activityResult.data : []}
        completedTasks={completedTasks}
        employee={employee}
        employees={employees.map(({ id, name }) => ({ id, name }))}
        isAdmin={
          session.kind === "authenticated" && session.user.role === "admin"
        }
        openTasks={openTasks}
        projects={projects}
        tab={tab}
        viewerId={session.kind === "authenticated" ? session.user.id : null}
      />
    </>
  );
};

const STATS = [
  "Active projects",
  "Assigned tasks",
  "Completed tasks",
  "Overdue",
] as const;

const TASK_ROWS = SKELETON_KEYS.slice(0, 5);

const PROJECT_ROWS = SKELETON_KEYS.slice(0, 4);

const ACTIVITY_ROWS = SKELETON_KEYS.slice(0, 5);

// Mirrors MemberProfileHeader: the person is data; the Copy email and Assign
// task buttons are static. The admin-only Manage button is left out, as
// most people never see it.
const MemberHeaderSkeleton = () => (
  <SkeletonRegion label="Loading member profile…">
    <header className="member-profile-header">
      <Avatar className="member-profile-avatar">
        <AvatarFallback />
      </Avatar>
      <div className="member-profile-identity">
        <div className="member-profile-name-row">
          <h1>
            <SkeletonBone shape="line" width="12ch" />
          </h1>
          <Badge variant="secondary">
            <SkeletonBone shape="line" width="5ch" />
          </Badge>
        </div>
        <p className="member-profile-job">
          <SkeletonBone shape="line" width="22ch" />
        </p>
        <span className="member-profile-email">
          <EnvelopeSimple aria-hidden="true" size={15} />
          <span>
            <SkeletonBone shape="line" width="20ch" />
          </span>
        </span>
      </div>
      <div className="member-profile-actions">
        <WorkspaceButton className="btn btn-secondary btn-sm" type="button">
          <Copy aria-hidden="true" size={14} />
          Copy email
        </WorkspaceButton>
        <WorkspaceButton className="btn btn-primary" type="button">
          Assign task
        </WorkspaceButton>
      </div>
    </header>
  </SkeletonRegion>
);

// Mirrors MemberProfileWork: stat labels, tab names and panel titles are
// static; the counts and rows are data.
const MemberWorkSkeleton = () => (
  <SkeletonRegion label="Loading member work…">
    <div className="member-profile-page">
      <section className="stats member-profile-stats">
        {STATS.map((label) => (
          <div className="stat" key={label}>
            <span className="k">{label}</span>
            <span className="v">
              <SkeletonBone shape="line" width="2ch" />
            </span>
          </div>
        ))}
      </section>
      <div className="member-profile-grid">
        <section className="panel">
          <nav aria-label="Member task filters" className="member-profile-tabs">
            <span aria-current="page">Assigned</span>
            <span>Completed</span>
          </nav>
          <ul className="member-profile-task-list">
            {TASK_ROWS.map((key) => (
              <li className="member-profile-task" key={key}>
                <span aria-hidden="true" className="project-status-dot" />
                <div className="member-profile-task-copy">
                  <WorkspaceButton
                    className="member-profile-task-title"
                    type="button"
                  >
                    <SkeletonBone shape="line" width="24ch" />
                  </WorkspaceButton>
                  <span>
                    <SkeletonBone shape="line" width="30ch" />
                  </span>
                </div>
                <span className="member-profile-task-meta">
                  <SkeletonBone shape="line" width="10ch" />
                  <Badge variant="outline">
                    <SkeletonBone shape="line" width="6ch" />
                  </Badge>
                </span>
              </li>
            ))}
          </ul>
        </section>
        <div className="member-profile-side">
          <section className="panel">
            <div className="panel-h">
              <h2>Active projects</h2>
              <span className="faint">
                <SkeletonBone shape="line" width="2ch" />
              </span>
            </div>
            <ul className="member-profile-project-list">
              {PROJECT_ROWS.map((key) => (
                <li key={key}>
                  <span className="member-profile-project-link">
                    <span
                      aria-hidden="true"
                      className="member-profile-project-color"
                    />
                    <span>
                      <SkeletonBone shape="line" width="16ch" />
                    </span>
                    <span className="faint">
                      <SkeletonBone shape="line" width="6ch" />
                    </span>
                  </span>
                </li>
              ))}
            </ul>
          </section>
          <section className="panel">
            <div className="panel-h">
              <h2>Recent activity</h2>
            </div>
            <ul className="member-profile-activity-list">
              {ACTIVITY_ROWS.map((key) => (
                <li key={key}>
                  <span
                    aria-hidden="true"
                    className="member-profile-activity-dot"
                  />
                  <div>
                    <p>
                      <SkeletonBone shape="line" width="30ch" />
                    </p>
                    <time>
                      <SkeletonBone shape="line" width="8ch" />
                    </time>
                  </div>
                </li>
              ))}
            </ul>
          </section>
        </div>
      </div>
    </div>
  </SkeletonRegion>
);

export { MemberHeader, MemberHeaderSkeleton, MemberWork, MemberWorkSkeleton };

/* eslint-disable shadcn/no-unknown-classes */

import { Star } from "@phosphor-icons/react/dist/ssr";
import Link from "next/link";

import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/workspace/empty-state";
import { ErrorToast } from "@/components/workspace/error-toast";
import {
  SKELETON_KEYS,
  SkeletonBone,
} from "@/components/workspace/skeleton-shapes";
import {
  SkeletonKeep,
  SkelterSurface,
} from "@/components/workspace/skelter-surface";
import { FavoriteToggle } from "@/features/discovery/components/favorite-toggle";
import { getPersonalWorkspace } from "@/features/discovery/discovery-queries";
import { listAllEmployees } from "@/features/people/people-queries";
import {
  ProjectGridView,
  ProjectCardSkeleton,
} from "@/features/projects/components/project-list-layouts";
import { listProjects } from "@/features/projects/projects-queries";
import { TaskCompletionCheckbox } from "@/features/tasks/components/task-completion-checkbox";
import { getPageSession } from "@/src/server/auth/page-session";

const taskStatusLabels = {
  backlog: "Backlog",
  done: "Done",
  progress: "In Progress",
  review: "Review",
  todo: "To Do",
} as const;

const taskPriorityLabels = {
  high: "High",
  low: "Low",
  medium: "Medium",
  none: "No priority",
  urgent: "Urgent",
} as const;

const FavoriteWork = async () => {
  const [personal, projectsResult, employeesResult, session] =
    await Promise.all([
      getPersonalWorkspace({}),
      listProjects({}),
      listAllEmployees(),
      getPageSession(),
    ]);

  if (!personal.ok || !projectsResult.ok) {
    throw new Error("Favorites could not be loaded.");
  }

  const favoriteProjectIds = new Set(
    personal.data.projects.map((project) => project.id)
  );
  const projects = projectsResult.data.filter((project) =>
    favoriteProjectIds.has(project.id)
  );
  const employees = employeesResult.ok ? employeesResult.data : [];
  const membersById = new Map(
    employees.map((employee) => [employee.id, employee])
  );
  const isAdmin =
    session.kind === "authenticated" && session.user.role === "admin";
  const userId = session.kind === "authenticated" ? session.user.id : "";

  return (
    <>
      <ErrorToast
        message={employeesResult.ok ? null : employeesResult.error.message}
      />
      <section aria-labelledby="favorite-projects-heading" className="stack">
        <h2 className="section-heading" id="favorite-projects-heading">
          Projects <span className="muted">{projects.length}</span>
        </h2>
        {projects.length ? (
          <ProjectGridView
            favorites={favoriteProjectIds}
            isAdmin={isAdmin}
            membersById={membersById}
            projects={projects}
          />
        ) : (
          <EmptyState
            action={
              <Link className="favorite-empty-link" href="/projects">
                Browse projects
              </Link>
            }
            description="Star a project to keep it close at hand."
            icon={Star}
            size="panel"
            title="No favorite projects yet"
          />
        )}
      </section>

      <section aria-labelledby="favorite-tasks-heading" className="stack">
        <h2 className="section-heading" id="favorite-tasks-heading">
          Tasks <span className="muted">{personal.data.tasks.length}</span>
        </h2>
        {personal.data.tasks.length ? (
          <div className="panel favorite-task-list fav-table">
            <div aria-hidden="true" className="fav-head">
              <span />
              <span>Task</span>
              <span>Status</span>
              <span>Priority</span>
              <span>Due</span>
              <span>Assignees</span>
              <span />
            </div>
            {personal.data.tasks.map((task) => {
              const canEdit =
                isAdmin ||
                task.createdById === userId ||
                task.assignees.some((assignee) => assignee.id === userId);

              return (
                <article className="favorite-task-row fav-row" key={task.id}>
                  {canEdit ? (
                    <TaskCompletionCheckbox
                      status={task.status}
                      taskId={task.id}
                      title={task.title}
                      version={task.version}
                    />
                  ) : (
                    <span
                      aria-hidden="true"
                      className="favorite-task-status-dot"
                    />
                  )}
                  <div className="favorite-task-main">
                    <Link
                      className="favorite-task-title"
                      href={`/projects/${task.projectId}?task=${task.id}`}
                    >
                      {task.title}
                    </Link>
                    <Link
                      className="favorite-task-project"
                      href={`/projects/${task.projectId}`}
                    >
                      {task.projectName}
                    </Link>
                  </div>
                  <span className="fav-cell" data-label="Status">
                    <Badge data-task-status={task.status} variant="outline">
                      {taskStatusLabels[task.status]}
                    </Badge>
                  </span>
                  <span className="fav-cell" data-label="Priority">
                    {task.priority === "none" ? (
                      <span className="muted">—</span>
                    ) : (
                      <span className={`fav-priority prio-${task.priority}`}>
                        {taskPriorityLabels[task.priority]}
                      </span>
                    )}
                  </span>
                  <span className="fav-cell" data-label="Due">
                    {task.dueDate ? (
                      <time dateTime={task.dueDate}>{task.dueDate}</time>
                    ) : (
                      <span className="muted">—</span>
                    )}
                  </span>
                  <ul
                    aria-label={`Assignees: ${task.assignees.map(({ name }) => name).join(", ") || "Unassigned"}`}
                    className="favorite-task-assignees fav-cell"
                  >
                    {task.assignees.slice(0, 3).map((assignee) => (
                      <li
                        aria-label={assignee.name}
                        key={assignee.id}
                        title={assignee.name}
                      >
                        <span aria-hidden="true" className="av">
                          {assignee.name.slice(0, 1).toUpperCase()}
                        </span>
                      </li>
                    ))}
                    {task.assignees.length > 3 ? (
                      <li className="muted">+{task.assignees.length - 3}</li>
                    ) : null}
                    {task.assignees.length === 0 ? (
                      <li className="muted">—</li>
                    ) : null}
                  </ul>
                  <FavoriteToggle id={task.id} initialFavorite kind="task" />
                </article>
              );
            })}
          </div>
        ) : (
          <EmptyState
            action={
              <Link className="favorite-empty-link" href="/tasks">
                Browse tasks
              </Link>
            }
            description="Star tasks to find them quickly here."
            icon={Star}
            size="panel"
            title="No favorite tasks yet"
          />
        )}
      </section>
    </>
  );
};

const FAVORITE_PROJECTS = SKELETON_KEYS.slice(0, 3);

const FAVORITE_TASKS = SKELETON_KEYS.slice(0, 5);

const FAVORITE_TASK_CELLS = ["Status", "Priority", "Due"] as const;

// Mirrors FavoriteWork with the same grid and table classes: section headings
// and column titles are static; counts, project cards and task rows are data.
const FavoriteWorkSkeleton = () => (
  <>
    <section className="stack">
      <h2 className="section-heading">Projects</h2>
      <SkelterSurface label="Loading favorite projects…">
        <div className="pgrid">
          {FAVORITE_PROJECTS.map((key) => (
            <ProjectCardSkeleton key={key} />
          ))}
        </div>
      </SkelterSurface>
    </section>
    <section className="stack">
      <h2 className="section-heading">Tasks</h2>
      <SkelterSurface label="Loading favorite tasks…">
        <div className="panel favorite-task-list fav-table">
          <SkeletonKeep>
            <div className="fav-head">
              <span />
              <span>Task</span>
              <span>Status</span>
              <span>Priority</span>
              <span>Due</span>
              <span>Assignees</span>
              <span />
            </div>
          </SkeletonKeep>
          {FAVORITE_TASKS.map((key) => (
            <article className="favorite-task-row fav-row" key={key}>
              <span className="favorite-task-status-dot" />
              <div className="favorite-task-main">
                <span className="favorite-task-title">
                  <SkeletonBone />
                </span>
                <span className="favorite-task-project">
                  <SkeletonBone shape="short" />
                </span>
              </div>
              {FAVORITE_TASK_CELLS.map((label) => (
                <span className="fav-cell" data-label={label} key={label}>
                  <SkeletonBone shape="short" />
                </span>
              ))}
              <ul className="favorite-task-assignees fav-cell">
                <li>
                  <SkeletonBone shape="avatar" />
                </li>
              </ul>
              <span />
            </article>
          ))}
        </div>
      </SkelterSurface>
    </section>
  </>
);

export { FavoriteWork, FavoriteWorkSkeleton };

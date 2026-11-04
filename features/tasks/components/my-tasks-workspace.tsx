/* eslint-disable shadcn/no-unknown-classes */

"use client";

import Link from "next/link";
import { useMemo } from "react";

import { WorkspaceButton } from "@/components/workspace/workspace-button";
import type { CalendarTask } from "@/features/calendar/components/task-calendar-grid";
import { FavoriteToggle } from "@/features/discovery/components/favorite-toggle";
import { GlobalTaskFilterBar } from "@/features/tasks/components/global-task-filter-bar";
import { MyTasksCalendar } from "@/features/tasks/components/my-tasks-calendar";
import { QuickTaskForm } from "@/features/tasks/components/quick-task-form";
import { useTaskDrawer } from "@/features/tasks/components/task-drawer";
import { TaskManageControls } from "@/features/tasks/components/task-manage-controls";
import { TaskStatusSelect } from "@/features/tasks/components/task-status-select";
import type { DueGroup } from "@/features/tasks/global-task-view-state";
import {
  MY_TASK_VIEWS,
  filterGlobalTasks,
  globalTaskHref,
  globalTaskQuery,
  groupTasksByDueDate,
  sortGlobalTasks,
} from "@/features/tasks/global-task-view-state";
import { useGlobalTaskView } from "@/features/tasks/hooks/use-global-task-view";
import type { EmployeeDirectoryEntry } from "@/src/server/people/user-contracts";
import type { ProjectTaskListItem } from "@/src/server/work/work-contracts";

export interface AssignedTask extends Omit<
  ProjectTaskListItem,
  "completionUndo" | "recurrenceSuccessorId"
> {
  readonly projectId: string;
  readonly projectKey: string;
  readonly projectName: string;
}

interface CalendarProject {
  readonly color: string;
  readonly id: string;
  readonly name: string;
}

interface MyTasksWorkspaceProps {
  readonly calendarMode: "month" | "week";
  readonly calendarProjects: readonly CalendarProject[];
  readonly employees: readonly EmployeeDirectoryEntry[];
  readonly favoriteTaskIds: ReadonlySet<string>;
  readonly isAdmin: boolean;
  readonly monthLabel: string;
  readonly monthOffset: number;
  readonly tasks: readonly AssignedTask[];
  readonly today: string;
  readonly userId: string;
}

const DUE_SUMMARY_DESCRIPTIONS: Readonly<Record<string, string>> = {
  overdue: "overdue",
  today: "due today",
  upcoming: "upcoming",
};

const DUE_FORMATTER = new Intl.DateTimeFormat("en", {
  day: "numeric",
  month: "short",
  year: "numeric",
});

const formatDueDate = (value: string | null): string =>
  value ? DUE_FORMATTER.format(new Date(`${value}T00:00:00`)) : "—";

const TaskRows = ({
  groups,
  favoriteTaskIds,
  employees,
  userId,
  isAdmin,
}: {
  readonly groups: readonly DueGroup<AssignedTask>[];
  readonly favoriteTaskIds: ReadonlySet<string>;
  readonly employees: readonly EmployeeDirectoryEntry[];
  readonly userId: string;
  readonly isAdmin: boolean;
}) => {
  const drawer = useTaskDrawer();
  return (
    <div className="mtt-wrap">
      <table className="mtt">
        <caption className="sr-only">
          My assigned tasks grouped by due date
        </caption>
        <colgroup>
          <col className="mtt-col-task" />
          <col className="mtt-col-project" />
          <col className="mtt-col-status" />
          <col className="mtt-col-priority" />
          <col className="mtt-col-due" />
          <col className="mtt-col-actions" />
        </colgroup>
        <thead>
          <tr>
            <th scope="col">Task</th>
            <th scope="col">Project</th>
            <th scope="col">Status</th>
            <th scope="col">Priority</th>
            <th scope="col">Due date</th>
            <th className="mtt-actions-head" scope="col">
              Actions
            </th>
          </tr>
        </thead>
        {groups.map((group) => (
          <tbody className={`mtt-group-body is-${group.id}`} key={group.id}>
            <tr className="mtt-group">
              <th colSpan={6} scope="colgroup">
                {group.label} <span>{group.tasks.length}</span>
              </th>
            </tr>
            {group.tasks.map((task) => (
              <tr className="mtt-row" key={task.id}>
                <td className="mtt-task" data-label="Task">
                  <div className="mtt-task-inner">
                    <button
                      className="mtt-title"
                      aria-label={`Open ${task.title}`}
                      onClick={() => drawer?.openTask(task.id)}
                      onFocus={() => drawer?.prefetchTask(task.id)}
                      onPointerEnter={() => drawer?.prefetchTask(task.id)}
                      title={`Open ${task.title}`}
                      type="button"
                    >
                      {task.title}
                    </button>
                    <span className="mono mtt-key">
                      {task.projectKey}-{task.projectTaskNumber}
                    </span>
                  </div>
                </td>
                <td data-label="Project">
                  <Link
                    className="mtt-project"
                    href={`/projects/${task.projectId}`}
                    title={task.projectName}
                  >
                    {task.projectName}
                  </Link>
                </td>
                <td data-label="Status">
                  <TaskStatusSelect
                    status={task.status}
                    taskId={task.id}
                    version={task.version}
                  />
                </td>
                <td data-label="Priority">
                  <span className={`mtt-priority prio-${task.priority}`}>
                    {task.priority}
                  </span>
                </td>
                <td
                  className={`mtt-due${group.id === "overdue" ? " is-overdue" : ""}`}
                  data-label="Due"
                >
                  {formatDueDate(task.dueDate)}
                </td>
                <td className="mtt-actions" data-label="Actions">
                  <div className="mtt-actions-inner">
                    <FavoriteToggle
                      id={task.id}
                      initialFavorite={favoriteTaskIds.has(task.id)}
                      kind="task"
                    />
                    <TaskManageControls
                      canEdit
                      currentUserId={userId}
                      employees={employees}
                      isAdmin={isAdmin}
                      task={task}
                    />
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        ))}
      </table>
    </div>
  );
};

// Tabs are links so the server recomputes the calendar range, and each link keeps
// every filter the user has set.
export const MyTasksWorkspace = ({
  calendarMode,
  calendarProjects,
  employees,
  favoriteTaskIds,
  isAdmin,
  monthLabel,
  monthOffset,
  tasks,
  today,
  userId,
}: MyTasksWorkspaceProps) => {
  const { raw, search, update } = useGlobalTaskView(MY_TASK_VIEWS);
  const visibleTasks = useMemo(
    () => sortGlobalTasks(filterGlobalTasks(tasks, search, today), search.sort),
    [tasks, search, today]
  );
  const groups = useMemo(
    () => groupTasksByDueDate(visibleTasks, today),
    [visibleTasks, today]
  );
  const dueSummary = groups
    .flatMap((group) => {
      const description = DUE_SUMMARY_DESCRIPTIONS[group.id];
      return description ? [`${group.tasks.length} ${description}`] : [];
    })
    .join(" · ");
  const calendarTasks: CalendarTask[] = useMemo(
    () =>
      visibleTasks.map((task) => ({
        assigneeIds: task.assigneeIds,
        createdById: task.createdById,
        dependencyIds: task.dependencyIds,
        dueDate: task.dueDate,
        id: task.id,
        labelIds: task.labelIds,
        position: task.position,
        priority: task.priority,
        projectId: task.projectId,
        projectName: task.projectName,
        recurrence: task.recurrence,
        startDate: task.startDate,
        status: task.status,
        title: task.title,
        version: task.version,
      })),
    [visibleTasks]
  );
  const view = search.view === "calendar" ? "calendar" : "list";
  const calendarHrefPrefix = `/my-tasks?${globalTaskQuery(raw, {
    monthOffset: "",
    view: "calendar",
  })}&monthOffset=` as const;

  return (
    <>
      <div className="ph my-tasks-header">
        <div>
          <h1>My Tasks</h1>
          <p>{dueSummary || `${visibleTasks.length} assigned tasks`}</p>
        </div>
        {calendarProjects.length > 0 ? (
          <QuickTaskForm
            projects={calendarProjects.map(({ id, name }) => ({ id, name }))}
          />
        ) : null}
        <nav aria-label="My Tasks view" className="row">
          <WorkspaceButton
            asChild
            size="sm"
            variant={view === "list" ? "default" : "secondary"}
          >
            <Link
              aria-current={view === "list" ? "page" : undefined}
              href={globalTaskHref("/my-tasks", raw, { view: "list" })}
            >
              List
            </Link>
          </WorkspaceButton>
          <WorkspaceButton
            asChild
            size="sm"
            variant={view === "calendar" ? "default" : "secondary"}
          >
            <Link
              aria-current={view === "calendar" ? "page" : undefined}
              href={globalTaskHref("/my-tasks", raw, { view: "calendar" })}
            >
              Calendar
            </Link>
          </WorkspaceButton>
        </nav>
      </div>
      <GlobalTaskFilterBar
        idPrefix="my-tasks"
        onChange={update}
        raw={raw}
        searchLabel="Search my tasks"
        showGroup={false}
      />
      {view === "calendar" ? (
        <MyTasksCalendar
          currentUserId={userId}
          employees={employees}
          hrefPrefix={calendarHrefPrefix}
          isAdmin={isAdmin}
          monthLabel={monthLabel}
          monthOffset={monthOffset}
          projects={calendarProjects}
          tasks={calendarTasks}
          viewMode={calendarMode}
        />
      ) : null}
      {view === "list" && visibleTasks.length > 0 ? (
        <TaskRows
          employees={employees}
          favoriteTaskIds={favoriteTaskIds}
          groups={groups}
          isAdmin={isAdmin}
          userId={userId}
        />
      ) : null}
      {view === "list" && visibleTasks.length === 0 ? (
        <section className="panel panel-b">
          <h2>
            {tasks.length
              ? "No tasks match these filters"
              : "No tasks assigned to you"}
          </h2>
          <p className="muted">
            {tasks.length
              ? "Change the filters to see more of your tasks."
              : "Tasks assigned to your account will appear here."}
          </p>
        </section>
      ) : null}
    </>
  );
};

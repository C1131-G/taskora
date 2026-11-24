"use client";

/* eslint-disable shadcn/no-unknown-classes */

import Link from "next/link";
import { useMemo } from "react";

import { WorkspaceButton } from "@/components/workspace/workspace-button";
import type { CalendarTask } from "@/features/calendar/components/task-calendar-grid";
import { GlobalTaskFilterBar } from "@/features/tasks/components/global-task-filter-bar";
import { MyTasksCalendar } from "@/features/tasks/components/my-tasks-calendar";
import { QuickTaskForm } from "@/features/tasks/components/quick-task-form";
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

import { TaskRows } from "./my-task-rows";
import { DUE_SUMMARY_DESCRIPTIONS } from "./my-tasks-format";
import type { AssignedTask } from "./my-tasks-types";

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
          <h1 aria-hidden="true">My tasks</h1>
          <p>{dueSummary || `${visibleTasks.length} assigned tasks`}</p>
        </div>
        {calendarProjects.length > 0 ? (
          <QuickTaskForm
            projects={calendarProjects.map(({ id, name }) => ({ id, name }))}
          />
        ) : null}
        <nav aria-label="My tasks view" className="row">
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

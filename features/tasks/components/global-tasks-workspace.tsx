/* eslint-disable shadcn/no-unknown-classes, shadcn/no-restyle */

"use client";

import {
  DownloadSimple,
  Kanban,
  ListBullets,
  Plus,
  Table,
  UploadSimple,
} from "@phosphor-icons/react";
import { useMemo } from "react";

import { SkeletonBone } from "@/components/workspace/skeleton-shapes";
import { TaskTableSkeleton } from "@/components/workspace/task-table-skeleton";
import { WorkspaceButton } from "@/components/workspace/workspace-button";
import { GlobalTaskBoardSkeleton } from "@/features/tasks/components/global-task-board";
import {
  GlobalTaskFilterBar,
  GlobalTaskFilterBarSkeleton,
} from "@/features/tasks/components/global-task-filter-bar";
import {
  GlobalTaskRows,
  GlobalTaskSelectionBarSkeleton,
} from "@/features/tasks/components/global-task-rows";
import { QuickTaskForm } from "@/features/tasks/components/quick-task-form";
import { TaskCsvTools } from "@/features/tasks/components/task-csv-tools";
import {
  GLOBAL_TASK_VIEWS,
  filterGlobalTasks,
  groupGlobalTasks,
  sortGlobalTasks,
} from "@/features/tasks/global-task-view-state";
import { useGlobalTaskView } from "@/features/tasks/hooks/use-global-task-view";
import { exportFiltersFromSearch } from "@/features/tasks/task-csv-view";
import type { EmployeeDirectoryEntry } from "@/src/server/people/user-contracts";
import type { ProjectTaskListItem } from "@/src/server/work/work-contracts";

type GlobalTask = Omit<
  ProjectTaskListItem,
  "completionUndo" | "recurrenceSuccessorId"
> & {
  readonly projectKey: string;
  readonly projectName: string;
};

type TaskView = "list" | "board" | "table";

// The table view owns the column menu, sorting and resizing; it was reachable
// only as "Table" for the plain list after the redesign, which hid those.
const TASK_VIEW_LABELS: Readonly<Record<TaskView, string>> = {
  board: "Board",
  list: "List",
  table: "Table",
};

const toTaskView = (value: string): TaskView =>
  value === "board" || value === "table" ? value : "list";

const taskDescription = (
  status: string,
  overdue: boolean,
  projectCount: number
): string => {
  if (status !== "all") {
    return `Tasks in ${status} status.`;
  }
  if (overdue) {
    return "Open tasks past their due date.";
  }
  return `Every task across ${projectCount} projects.`;
};

const TaskViewSwitch = ({
  onSelect,
  view,
}: {
  readonly onSelect?: (view: TaskView) => void;
  readonly view: TaskView;
}) => (
  <nav aria-label="Task view" className="row task-view-tabs">
    {GLOBAL_TASK_VIEWS.map((taskView) => (
      <WorkspaceButton
        aria-current={view === taskView ? "page" : undefined}
        key={taskView}
        onClick={() => onSelect?.(taskView)}
        size="sm"
        variant={view === taskView ? "default" : "secondary"}
      >
        {taskView === "list" ? (
          <ListBullets aria-hidden="true" size={15} />
        ) : null}
        {taskView === "table" ? <Table aria-hidden="true" size={15} /> : null}
        {taskView === "board" ? <Kanban aria-hidden="true" size={15} /> : null}
        {TASK_VIEW_LABELS[taskView]}
      </WorkspaceButton>
    ))}
  </nav>
);

export const GlobalTasksWorkspace = ({
  employees,
  favoriteTaskIds,
  isAdmin,
  projects,
  tasks,
  today,
  userId,
}: {
  readonly employees: readonly EmployeeDirectoryEntry[];
  readonly favoriteTaskIds: ReadonlySet<string>;
  readonly isAdmin: boolean;
  readonly projects: readonly { readonly id: string; readonly name: string }[];
  readonly tasks: readonly GlobalTask[];
  readonly today: string;
  readonly userId: string | null;
}) => {
  const { raw, search, update } = useGlobalTaskView(GLOBAL_TASK_VIEWS);
  const visibleTasks = useMemo(
    () => sortGlobalTasks(filterGlobalTasks(tasks, search, today), search.sort),
    [tasks, search, today]
  );
  const taskGroups = useMemo(
    () => groupGlobalTasks(visibleTasks, search.group),
    [visibleTasks, search.group]
  );
  const view = toTaskView(search.view);

  const viewSwitch = (
    <TaskViewSwitch
      onSelect={(taskView) => update({ view: taskView })}
      view={view}
    />
  );

  return (
    <>
      <div className="ph">
        <div>
          <h1 aria-hidden="true">Tasks</h1>
          <p>
            {taskDescription(search.status, search.overdue, projects.length)}
          </p>
        </div>
        <div className="row">
          <TaskCsvTools
            filters={exportFiltersFromSearch(search)}
            projects={projects}
            today={today}
          />
          <QuickTaskForm projects={projects} />
        </div>
      </div>
      <GlobalTaskFilterBar
        idPrefix="tasks"
        onChange={update}
        raw={raw}
        searchLabel="Search tasks"
        showGroup
      />
      {visibleTasks.length ? (
        <GlobalTaskRows
          employees={employees}
          favoriteTaskIds={favoriteTaskIds}
          isAdmin={isAdmin}
          taskGroups={taskGroups}
          userId={userId}
          view={view}
          viewSwitch={viewSwitch}
        />
      ) : (
        <>
          {viewSwitch}
          <section className="panel panel-b">
            <h2>
              {tasks.length ? "No tasks match these filters" : "No tasks yet"}
            </h2>
            <p className="muted">
              {tasks.length
                ? "Change the filter to see more tasks."
                : "Tasks will appear here when they are created in a project."}
            </p>
          </section>
        </>
      )}
    </>
  );
};

// The loading state is the real page frame: the header and its actions, the
// filter row and the selection bar stay as they are (inert); only the tasks and
// the subtitle that counts them are bones. The view comes from the URL.
export const GlobalTasksWorkspaceSkeleton = ({
  view,
}: {
  readonly view: TaskView;
}) => (
  <>
    <div className="ph">
      <div>
        <h1 aria-hidden="true">Tasks</h1>
        <p aria-hidden="true" className="min-h-lh">
          <SkeletonBone shape="short" />
        </p>
      </div>
      <div aria-hidden="true" className="row" inert>
        <WorkspaceButton className="btn btn-secondary btn-sm" type="button">
          <DownloadSimple aria-hidden="true" size={14} />
          Export CSV
        </WorkspaceButton>
        <WorkspaceButton className="btn btn-secondary btn-sm" type="button">
          <UploadSimple aria-hidden="true" size={14} />
          Import CSV
        </WorkspaceButton>
        <WorkspaceButton className="btn btn-primary btn-sm" type="button">
          <Plus aria-hidden="true" size={14} />
          New task
        </WorkspaceButton>
      </div>
    </div>
    <GlobalTaskFilterBarSkeleton
      idPrefix="tasks"
      searchLabel="Search tasks"
      showGroup
    />
    <GlobalTaskSelectionBarSkeleton
      viewSwitch={<TaskViewSwitch view={view} />}
    />
    {view === "board" ? (
      <GlobalTaskBoardSkeleton />
    ) : (
      <TaskTableSkeleton global />
    )}
  </>
);

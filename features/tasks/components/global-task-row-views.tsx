/* eslint-disable shadcn/no-unknown-classes, shadcn/no-inline-styles */
/* eslint-disable shadcn/no-restyle */

"use client";

import Link from "next/link";
import type { ReactNode } from "react";

import { Checkbox } from "@/components/ui/checkbox";
import {
  Table,
  TableBody,
  TableCaption,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { FavoriteToggle } from "@/features/discovery/components/favorite-toggle";
import { useTaskDrawer } from "@/features/tasks/components/task-drawer";
import { TaskManageControls } from "@/features/tasks/components/task-manage-controls";
import { TaskStatusSelect } from "@/features/tasks/components/task-status-select";
import { TaskTableHeaderCell } from "@/features/tasks/components/task-table-header-cell";
import type {
  TaskTableColumnDef,
  TaskTableColumnId,
} from "@/features/tasks/task-table-columns";
import {
  GLOBAL_TASK_COLUMNS,
  defaultColumnWidth,
} from "@/features/tasks/task-table-columns";
import type {
  GlobalTask,
  GlobalTaskViewProps,
} from "@/features/tasks/types/global-task-row-contracts";
import type { EmployeeDirectoryEntry } from "@/src/server/people/user-contracts";

const canEditTask = (
  task: GlobalTask,
  userId: string | null,
  isAdmin: boolean
): boolean =>
  isAdmin ||
  task.createdById === userId ||
  task.assigneeIds.includes(userId ?? "");

const TaskStatus = ({
  task,
  canEdit,
}: {
  readonly task: GlobalTask;
  readonly canEdit: boolean;
}) =>
  canEdit ? (
    <TaskStatusSelect
      status={task.status}
      taskId={task.id}
      version={task.version}
    />
  ) : (
    <span className={`pstatus ${task.status}`}>{task.status}</span>
  );

const TaskActions = ({
  task,
  favoriteTaskIds,
  employees,
  userId,
  isAdmin,
}: {
  readonly task: GlobalTask;
  readonly favoriteTaskIds: ReadonlySet<string>;
  readonly employees: readonly EmployeeDirectoryEntry[];
  readonly userId: string | null;
  readonly isAdmin: boolean;
}) => (
  <div className="c-meta row">
    <FavoriteToggle
      id={task.id}
      initialFavorite={favoriteTaskIds.has(task.id)}
      kind="task"
    />
    <TaskManageControls
      canEdit={canEditTask(task, userId, isAdmin)}
      currentUserId={userId}
      employees={employees}
      isAdmin={isAdmin}
      task={task}
    />
  </div>
);

const renderGlobalCell = (
  columnId: (typeof GLOBAL_TASK_COLUMNS)[number]["id"],
  task: GlobalTask,
  props: GlobalTaskViewProps
): ReactNode => {
  switch (columnId) {
    case "task": {
      return (
        <Link className="trunc" href={`/projects/${task.projectId}?view=board`}>
          <span className="mono faint">
            {task.projectKey}-{task.projectTaskNumber}
          </span>{" "}
          {task.title}
        </Link>
      );
    }
    case "status": {
      return (
        <TaskStatus
          canEdit={canEditTask(task, props.userId, props.isAdmin)}
          task={task}
        />
      );
    }
    case "assignees": {
      return task.assignees.length
        ? task.assignees.map(({ name }) => name).join(", ")
        : "Unassigned";
    }
    case "priority": {
      return task.priority;
    }
    case "due": {
      return task.dueDate ?? "—";
    }
    case "project": {
      return (
        <Link href={`/projects/${task.projectId}`}>{task.projectName}</Link>
      );
    }
    case "actions": {
      return <TaskActions {...props} task={task} />;
    }
    default: {
      const _exhaustive: never = columnId;
      return _exhaustive;
    }
  }
};

export const GlobalTaskTable = ({
  activeSort,
  columnWidths,
  hidden,
  onResize,
  onSort,
  props,
}: {
  readonly activeSort: string;
  readonly columnWidths: Partial<Record<TaskTableColumnId, number>>;
  readonly hidden: readonly TaskTableColumnId[];
  readonly onResize: (columnId: TaskTableColumnId, width: number) => void;
  readonly onSort: (field: string) => void;
  readonly props: GlobalTaskViewProps;
}) => {
  const visibleColumns = GLOBAL_TASK_COLUMNS.filter(
    (column) => !hidden.includes(column.id)
  );
  const widthOf = (column: TaskTableColumnDef) =>
    columnWidths[column.id] ?? defaultColumnWidth(column.id);

  return (
    <Table className="project-task-data-table">
      <TableCaption className="sr-only">Workspace tasks</TableCaption>
      <TableHeader>
        <TableRow>
          <TableHead className="w-10">
            <span className="sr-only">Select</span>
          </TableHead>
          {visibleColumns.map((column) => (
            <TaskTableHeaderCell
              activeSort={activeSort}
              column={column}
              key={column.id}
              onResize={onResize}
              onSort={onSort}
              width={widthOf(column)}
            />
          ))}
        </TableRow>
      </TableHeader>
      {props.taskGroups.map((group) => (
        <TableBody key={group.key}>
          <TableRow className="project-task-group-row">
            <TableCell colSpan={visibleColumns.length + 1}>
              {group.label} <span className="muted">{group.tasks.length}</span>
            </TableCell>
          </TableRow>
          {group.tasks.map((task) => (
            <TableRow key={task.id}>
              <TableCell>
                <Checkbox
                  aria-label={`Select ${task.title}`}
                  checked={props.selectedIds.has(task.id)}
                  onCheckedChange={(checked) =>
                    props.onToggle(task.id, checked === true)
                  }
                />
              </TableCell>
              {visibleColumns.map((column) => (
                <TableCell data-label={column.label} key={column.id}>
                  {renderGlobalCell(column.id, task, props)}
                </TableCell>
              ))}
            </TableRow>
          ))}
        </TableBody>
      ))}
    </Table>
  );
};

export const GlobalTaskList = ({
  taskGroups,
  favoriteTaskIds,
  employees,
  userId,
  isAdmin,
  selectedIds,
  onToggle,
}: GlobalTaskViewProps) => {
  const drawer = useTaskDrawer();
  return (
    <div className="mtt-wrap">
      <table className="mtt mtt-global">
        <caption className="sr-only">Workspace tasks grouped by status</caption>
        <colgroup>
          <col className="mtt-col-select" />
          <col className="mtt-col-task" />
          <col className="mtt-col-project mtt-opt" />
          <col className="mtt-col-status" />
          <col className="mtt-col-assignee mtt-opt" />
          <col className="mtt-col-priority" />
          <col className="mtt-col-due" />
          <col className="mtt-col-actions" />
        </colgroup>
        <thead>
          <tr>
            <th scope="col">
              <span className="sr-only">Select</span>
            </th>
            <th scope="col">Task</th>
            <th className="mtt-opt" scope="col">
              Project
            </th>
            <th scope="col">Status</th>
            <th className="mtt-opt" scope="col">
              Assignee
            </th>
            <th scope="col">Priority</th>
            <th scope="col">Due date</th>
            <th scope="col">Actions</th>
          </tr>
        </thead>
        {taskGroups.map((group) => (
          <tbody className="mtt-group-body" key={group.key}>
            <tr className="mtt-group">
              <th colSpan={6} scope="colgroup">
                {group.label} <span>{group.tasks.length}</span>
              </th>
              <th aria-hidden="true" className="mtt-opt" colSpan={2} />
            </tr>
            {group.tasks.map((task) => {
              const canEdit = canEditTask(task, userId, isAdmin);
              return (
                <tr className="mtt-row" key={task.id}>
                  <td data-label="Select">
                    <Checkbox
                      aria-label={`Select ${task.title}`}
                      checked={selectedIds.has(task.id)}
                      onCheckedChange={(checked) =>
                        onToggle(task.id, checked === true)
                      }
                    />
                  </td>
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
                        <span className="mtt-key-project">
                          {" · "}
                          {task.projectName}
                        </span>
                      </span>
                    </div>
                  </td>
                  <td className="mtt-opt" data-label="Project">
                    <Link
                      className="mtt-project"
                      href={`/projects/${task.projectId}`}
                      title={task.projectName}
                    >
                      {task.projectName}
                    </Link>
                  </td>
                  <td data-label="Status">
                    <TaskStatus canEdit={canEdit} task={task} />
                  </td>
                  <td className="mtt-opt" data-label="Assignee">
                    <span
                      className="mtt-assignees"
                      title={task.assignees.map(({ name }) => name).join(", ")}
                    >
                      {task.assignees.length
                        ? task.assignees.map(({ name }) => name).join(", ")
                        : "Unassigned"}
                    </span>
                  </td>
                  <td data-label="Priority">
                    <span className={`mtt-priority prio-${task.priority}`}>
                      {task.priority}
                    </span>
                  </td>
                  <td
                    className={`mtt-due${group.key === "overdue" ? " is-overdue" : ""}`}
                    data-label="Due"
                  >
                    {task.dueDate ?? "—"}
                  </td>
                  <td className="mtt-actions" data-label="Actions">
                    <div className="mtt-actions-inner">
                      <TaskActions
                        {...{ employees, favoriteTaskIds, isAdmin, userId }}
                        task={task}
                      />
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        ))}
      </table>
    </div>
  );
};

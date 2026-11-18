"use client";

/* eslint-disable shadcn/no-unknown-classes */

import Link from "next/link";

import { FavoriteToggle } from "@/features/discovery/components/favorite-toggle";
import { useTaskDrawer } from "@/features/tasks/components/task-drawer";
import { TaskManageControls } from "@/features/tasks/components/task-manage-controls";
import { TaskStatusSelect } from "@/features/tasks/components/task-status-select";
import type { DueGroup } from "@/features/tasks/global-task-view-state";
import type { EmployeeDirectoryEntry } from "@/src/server/people/user-contracts";

import { formatDueDate } from "./my-tasks-format";
import type { AssignedTask } from "./my-tasks-types";

export const TaskRows = ({
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

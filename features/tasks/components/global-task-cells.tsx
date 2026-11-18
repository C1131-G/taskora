"use client";

/* eslint-disable shadcn/no-unknown-classes, shadcn/no-inline-styles */

/* eslint-disable shadcn/no-restyle */

import { FavoriteToggle } from "@/features/discovery/components/favorite-toggle";
import { TaskManageControls } from "@/features/tasks/components/task-manage-controls";
import { TaskStatusSelect } from "@/features/tasks/components/task-status-select";
import type { GlobalTask } from "@/features/tasks/types/global-task-row-contracts";
import type { EmployeeDirectoryEntry } from "@/src/server/people/user-contracts";

import { canEditTask } from "./global-task-access";

export const TaskStatus = ({
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

export const TaskActions = ({
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

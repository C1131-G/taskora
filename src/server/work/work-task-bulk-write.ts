import type { ResultType } from "@prisma/orm-postgres/components/runtime";

import type { db } from "@/src/prisma/db";

import { AppError } from "../core/action-result";
import type { BulkTaskChanges } from "./work-contracts";
import type { Transaction } from "./work-internal";
import { taskStatusFields } from "./work-internal";
import type { BulkRecurrence, BulkTaskRow } from "./work-task-bulk-access";

export type UpdatedTaskRow = ResultType<typeof db.orm.public.Task>;

const staleTasksError = () =>
  new AppError({
    code: "CONFLICT",
    message: "One or more tasks changed. Refresh and try again.",
  });

export const missingTasksError = () =>
  new AppError({
    code: "NOT_FOUND",
    message: "One or more tasks were not found.",
  });

export const writeBulkTaskChange = async (
  transaction: Transaction,
  task: BulkTaskRow,
  expectedVersion: number | undefined,
  changes: BulkTaskChanges,
  now: Date
): Promise<UpdatedTaskRow> => {
  if (!expectedVersion) {
    throw staleTasksError();
  }
  const updatedCount = await transaction.orm.public.Task.where({
    id: task.id,
    version: expectedVersion,
  }).updateAndCount({
    ...taskStatusFields(changes.status, task.completedAt, now),
    dueDate: changes.dueDate,
    priority: changes.priority,
    updatedAt: now,
    version: expectedVersion + 1,
  });
  if (!updatedCount) {
    throw staleTasksError();
  }
  const updated = await transaction.orm.public.Task.where({
    id: task.id,
  }).first();
  if (!updated) {
    throw missingTasksError();
  }
  return updated;
};

export const replaceBulkAssignees = async (
  transaction: Transaction,
  taskIds: readonly string[],
  assigneeIds: readonly string[],
  actorId: string,
  now: Date
): Promise<void> => {
  await transaction.orm.public.TaskAssignee.where((assignment) =>
    assignment.taskId.in(taskIds)
  ).deleteAll();
  await Promise.all(
    taskIds.flatMap((taskId) =>
      assigneeIds.map((userId) =>
        transaction.orm.public.TaskAssignee.create({
          assignedAt: now,
          assignedById: actorId,
          taskId,
          userId,
        })
      )
    )
  );
};

// Keeps task_recurrence.nextRunAt equal to the task due date, as the single
// task update and reschedule writers do.
export const syncBulkRecurrenceDueDates = async (
  transaction: Transaction,
  tasks: readonly BulkTaskRow[],
  recurrences: readonly BulkRecurrence[],
  dueDate: string | null,
  now: Date
): Promise<void> => {
  const recurringTaskIds = new Set(recurrences.map(({ taskId }) => taskId));
  const taskIds = tasks.flatMap((task) =>
    recurringTaskIds.has(task.id) && task.dueDate !== dueDate ? [task.id] : []
  );
  if (taskIds.length === 0) {
    return;
  }
  await transaction.orm.public.TaskRecurrence.where((recurrence) =>
    recurrence.taskId.in(taskIds)
  ).updateAll({ nextRunAt: dueDate, updatedAt: now });
};

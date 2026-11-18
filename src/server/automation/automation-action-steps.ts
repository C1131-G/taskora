import { randomUUID } from "node:crypto";

import { AppError } from "../core/action-result";
import { notifyUsers } from "../notifications/notify-users";
import { enqueueWebhookEvent } from "../webhooks/webhook-enqueue";
import { taskStatusFields } from "../work/work-internal";
import type { ActionRun, MutableState } from "./automation-action-shared";
import {
  recordActivity,
  requireStaff,
  unavailable,
} from "./automation-action-shared";
import type {
  AutomationAction,
  AutomationTaskPriority,
  AutomationTaskStatus,
} from "./automation-model";

const writeTask = async (
  run: ActionRun,
  state: MutableState,
  changes:
    | {
        readonly status: AutomationTaskStatus;
        readonly completedAt: Date | null;
      }
    | { readonly priority: AutomationTaskPriority }
): Promise<void> => {
  const updated = await run.transaction.orm.public.Task.where({
    id: run.task.id,
    version: state.version,
  }).updateAndCount({
    ...changes,
    updatedAt: run.now,
    version: state.version + 1,
  });
  if (!updated) {
    // A person edited the task since the run started; the job is retried.
    throw new AppError({
      code: "CONFLICT",
      message: "The task changed during the automation run.",
    });
  }
  state.version += 1;
};

export const setStatus = async (
  run: ActionRun,
  state: MutableState,
  status: AutomationTaskStatus
): Promise<void> => {
  if (state.status === status) {
    return;
  }
  const { completedAt } = taskStatusFields(status, state.completedAt, run.now);
  await writeTask(run, state, { completedAt, status });
  await recordActivity(run, "task.status_changed", {
    from: state.status,
    to: status,
  });
  state.status = status;
  state.completedAt = completedAt;
  state.statusChanged = true;
};

export const setPriority = async (
  run: ActionRun,
  state: MutableState,
  priority: AutomationTaskPriority
): Promise<void> => {
  if (state.priority === priority) {
    return;
  }
  await writeTask(run, state, { priority });
  await recordActivity(run, "task.priority_changed", {
    from: state.priority,
    to: priority,
  });
  state.priority = priority;
  state.priorityChanged = true;
};

export const assign = async (
  run: ActionRun,
  state: MutableState,
  action: Extract<AutomationAction, { type: "assign" }>
): Promise<void> => {
  await requireStaff(run.transaction, action, action.userId);
  if (state.assigneeIds.includes(action.userId)) {
    return;
  }
  await run.transaction.orm.public.TaskAssignee.create({
    assignedAt: run.now,
    assignedById: run.rule.createdById,
    taskId: run.task.id,
    userId: action.userId,
  });
  state.assigneeIds.push(action.userId);
  state.assigneesChanged = true;
  await recordActivity(run, "task.assigned", { userId: action.userId });
  await notifyUsers(run.transaction, {
    actorId: null,
    now: run.now,
    projectId: run.task.projectId,
    recipientIds: [action.userId],
    snippet: run.task.title,
    taskId: run.task.id,
    text: `Automation "${run.rule.name}" assigned you a task`,
    type: "assignment",
    url: `/tasks/${run.task.id}`,
  });
};

export const unassign = async (
  run: ActionRun,
  state: MutableState,
  action: Extract<AutomationAction, { type: "unassign" }>
): Promise<void> => {
  if (!state.assigneeIds.includes(action.userId)) {
    return;
  }
  await run.transaction.orm.public.TaskAssignee.where({
    taskId: run.task.id,
    userId: action.userId,
  }).deleteAll();
  state.assigneeIds = state.assigneeIds.filter(
    (userId) => userId !== action.userId
  );
  state.assigneesChanged = true;
  await recordActivity(run, "task.unassigned", { userId: action.userId });
};

export const addLabel = async (
  run: ActionRun,
  state: MutableState,
  action: Extract<AutomationAction, { type: "add_label" }>
): Promise<void> => {
  const label = await run.transaction.orm.public.Label.where({
    id: action.labelId,
  })
    .select("id")
    .first();
  if (!label) {
    throw unavailable(action, "that label no longer exists");
  }
  if (state.labelIds.includes(action.labelId)) {
    return;
  }
  await run.transaction.orm.public.TaskLabel.create({
    labelId: action.labelId,
    taskId: run.task.id,
  });
  state.labelIds.push(action.labelId);
  await recordActivity(run, "task.label_added", { labelId: action.labelId });
};

// Always internal: automation can never write something a client can read.
export const postComment = async (
  run: ActionRun,
  action: Extract<AutomationAction, { type: "post_comment" }>
): Promise<void> => {
  const id = randomUUID();
  await run.transaction.orm.public.Comment.create({
    authorId: run.rule.createdById,
    body: `[Automation: ${run.rule.name}] ${action.body.trim()}`,
    createdAt: run.now,
    deletedAt: null,
    deletedById: null,
    id,
    taskId: run.task.id,
    updatedAt: run.now,
    visibility: "internal",
  });
  await recordActivity(run, "comment.created", {
    commentId: id,
    visibility: "internal",
  });
  await enqueueWebhookEvent(run.transaction, "comment.added", {
    data: {
      id,
      projectId: run.task.projectId,
      taskId: run.task.id,
      visibility: "internal",
    },
    now: run.now,
  });
};

export const notify = async (
  run: ActionRun,
  action: Extract<AutomationAction, { type: "notify" }>
): Promise<void> => {
  await requireStaff(run.transaction, action, action.userId);
  await notifyUsers(run.transaction, {
    actorId: null,
    now: run.now,
    projectId: run.task.projectId,
    recipientIds: [action.userId],
    snippet: run.task.title,
    taskId: run.task.id,
    text: `Automation "${run.rule.name}": ${action.message.trim()}`,
    type: "update",
    url: `/tasks/${run.task.id}`,
  });
};

import { enqueueTaskChange } from "../webhooks/webhook-task-event";
import type { ActionRun, MutableState } from "./automation-action-shared";
import {
  addLabel,
  assign,
  notify,
  postComment,
  setPriority,
  setStatus,
  unassign,
} from "./automation-action-steps";
import { enqueueAutomationEvent } from "./automation-enqueue";
import { eventsCausedBy } from "./automation-evaluator";
import type { FieldChanges } from "./automation-evaluator";
import type { AutomationAction } from "./automation-model";

const applyOne = (
  run: ActionRun,
  state: MutableState,
  action: AutomationAction
): Promise<void> => {
  switch (action.type) {
    case "set_status": {
      return setStatus(run, state, action.status);
    }
    case "set_priority": {
      return setPriority(run, state, action.priority);
    }
    case "assign": {
      return assign(run, state, action);
    }
    case "unassign": {
      return unassign(run, state, action);
    }
    case "add_label": {
      return addLabel(run, state, action);
    }
    case "post_comment": {
      return postComment(run, action);
    }
    case "notify": {
      return notify(run, action);
    }
    default: {
      const unhandled: never = action;
      return Promise.reject(new Error(`Unhandled action ${String(unhandled)}`));
    }
  }
};

/**
 * Applies a rule's actions in order inside the caller's transaction, then
 * raises the follow-up events one automation hop deeper. Any failure throws
 * and the caller's rollback undoes every earlier action of the run.
 */
export const applyActions = async (
  run: ActionRun,
  actions: readonly AutomationAction[]
): Promise<FieldChanges> => {
  const state: MutableState = {
    assigneeIds: [...run.task.assigneeIds],
    assigneesChanged: false,
    completedAt: run.task.completedAt,
    labelIds: [...run.task.labelIds],
    priority: run.task.priority,
    priorityChanged: false,
    status: run.task.status,
    statusChanged: false,
    version: run.task.version,
  };
  for (const action of actions) {
    // Actions are ordered and each sees the previous one's result.
    // oxlint-disable-next-line no-await-in-loop, react-doctor/async-await-in-loop
    await applyOne(run, state, action);
  }
  const changes: FieldChanges = {
    assigneesChanged: state.assigneesChanged,
    priorityChanged: state.priorityChanged,
    statusChanged: state.statusChanged,
  };
  if (state.statusChanged || state.priorityChanged) {
    await enqueueTaskChange(run.transaction, {
      dueDate: run.task.dueDate,
      id: run.task.id,
      now: run.now,
      previousStatus: run.task.status,
      priority: state.priority,
      projectId: run.task.projectId,
      projectTaskNumber: run.task.projectTaskNumber,
      status: state.status,
      title: run.task.title,
    });
  }
  await Promise.all(
    eventsCausedBy({
      changes,
      depth: run.eventDepth,
      ruleId: run.rule.id,
    }).map((caused) =>
      enqueueAutomationEvent(run.transaction, {
        causedByRuleId: caused.causedByRuleId,
        depth: caused.depth,
        now: run.now,
        projectId: run.task.projectId,
        taskId: run.task.id,
        trigger: caused.trigger,
      })
    )
  );
  return changes;
};

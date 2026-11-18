import { randomUUID } from "node:crypto";

import type { db } from "@/src/prisma/db";

import { AppError } from "../core/action-result";
import type {
  AutomationAction,
  AutomationTaskPriority,
  AutomationTaskStatus,
} from "./automation-model";

type Transaction = Parameters<Parameters<typeof db.transaction>[0]>[0];

export interface RunTask {
  readonly id: string;
  readonly projectId: string;
  readonly projectTaskNumber: number;
  readonly title: string;
  readonly status: AutomationTaskStatus;
  readonly priority: AutomationTaskPriority;
  readonly dueDate: string | null;
  readonly completedAt: Date | null;
  readonly version: number;
  readonly assigneeIds: readonly string[];
  readonly labelIds: readonly string[];
}

export interface RunRule {
  readonly id: string;
  readonly name: string;
  // Automation writes carry this person's id (the schema needs a real user)
  // but are marked as automation in the activity log and in comment text.
  readonly createdById: string;
}

export interface ActionRun {
  readonly transaction: Transaction;
  readonly rule: RunRule;
  readonly task: RunTask;
  // The depth of the event that triggered the rule.
  readonly eventDepth: number;
  readonly now: Date;
}

// Raised for a rule that cannot do what it says (an unavailable person, a
// missing label). The run is logged as failed and the job is not retried.
export const unavailable = (
  action: AutomationAction,
  message: string
): AppError =>
  new AppError({
    code: "VALIDATION_FAILED",
    message: `${action.type}: ${message}`,
  });

export const requireStaff = async (
  transaction: Transaction,
  action: AutomationAction,
  userId: string
): Promise<void> => {
  const person = await transaction.orm.public.User.where({ id: userId })
    .select("role", "deactivatedAt")
    .first();
  if (!person || person.deactivatedAt || person.role === "client") {
    throw unavailable(action, "that person is not an active team member");
  }
};

export interface MutableState {
  status: AutomationTaskStatus;
  priority: AutomationTaskPriority;
  version: number;
  completedAt: Date | null;
  assigneeIds: string[];
  labelIds: string[];
  statusChanged: boolean;
  priorityChanged: boolean;
  assigneesChanged: boolean;
}

export const recordActivity = (
  run: ActionRun,
  action: string,
  details: Record<string, string | number | boolean>
) =>
  run.transaction.orm.public.Activity.create({
    action: `automation.${action}`,
    actorId: run.rule.createdById,
    createdAt: run.now,
    details: {
      ...details,
      automation: true,
      depth: run.eventDepth + 1,
      ruleId: run.rule.id,
    },
    id: randomUUID(),
    projectId: run.task.projectId,
    taskId: run.task.id,
  });

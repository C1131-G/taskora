import { and } from "@prisma/orm-postgres/orm-client";

import type { SlaSettings } from "../company/sla-settings";
import { notifyUsers } from "../notifications/notify-users";
import type { SlaRow } from "./bug-sla";
import type { Transaction } from "./work-internal";

export const keyOf = (
  project: { readonly key: string },
  task: { readonly projectTaskNumber: number }
): string => `${project.key}-${task.projectTaskNumber}`;

export interface SweepContext {
  readonly sla: SlaRow;
  readonly settings: SlaSettings;
  readonly now: Date;
  readonly bug: {
    readonly id: string;
    readonly clientCompanyId: string | null;
    readonly taskId: string;
    readonly projectId: string;
  };
  readonly key: string;
  readonly title: string;
  // Loaded once per sweep; every breach and handler-less warning goes here.
  readonly adminIds: readonly string[];
}

export const assigneeIdsOf = async (
  transaction: Transaction,
  taskId: string
): Promise<string[]> => {
  const assignees = await transaction.orm.public.TaskAssignee.where({ taskId })
    .select("userId")
    .all();
  return assignees.map(({ userId }) => userId);
};

// Whoever should hear a warning: the assignee, or the company's handlers
// while nobody has picked the bug (the admins if it has none).
export const warningRecipients = async (
  transaction: Transaction,
  context: SweepContext
): Promise<readonly string[]> => {
  const assignees = await assigneeIdsOf(transaction, context.bug.taskId);
  if (assignees.length > 0) {
    return assignees;
  }
  const handlers = context.bug.clientCompanyId
    ? await transaction.orm.public.ClientCompanyHandler.where({
        companyId: context.bug.clientCompanyId,
      })
        .select("employeeId")
        .all()
    : [];
  const active = handlers.length
    ? await transaction.orm.public.User.where((user) =>
        and(
          user.id.in(handlers.map(({ employeeId }) => employeeId)),
          user.deactivatedAt.isNull()
        )
      )
        .select("id")
        .all()
    : [];
  return active.length > 0 ? active.map(({ id }) => id) : context.adminIds;
};

export const notifySla = async (
  transaction: Transaction,
  context: SweepContext,
  recipientIds: readonly string[],
  text: string
): Promise<void> => {
  await notifyUsers(transaction, {
    actorId: null,
    now: context.now,
    projectId: context.bug.projectId,
    recipientIds,
    snippet: context.title,
    taskId: context.bug.taskId,
    text,
    type: "sla",
    url: `/bugs/${context.bug.id}`,
  });
};

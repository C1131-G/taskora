import { and } from "@prisma/orm-postgres/orm-client";

import type { db } from "@/src/prisma/db";

import { AppError } from "../core/action-result";
import { COMPLETED_BUG_STATUSES } from "../work/bug-status-edges";
import type { CommentVisibility } from "./contracts";

export type Transaction = Parameters<Parameters<typeof db.transaction>[0]>[0];

export const forbidden = (message: string) =>
  new AppError({ code: "FORBIDDEN", message });

// Client users who should hear about a public reply: the reporter and anyone
// else from the company who has already joined the conversation.
export const clientParticipantIds = async (
  transaction: Transaction,
  bug: { readonly reporterId: string; readonly taskId: string }
): Promise<string[]> => {
  const authors = await transaction.orm.public.Comment.where({
    deletedAt: null,
    taskId: bug.taskId,
    visibility: "public",
  })
    .select("authorId")
    .all();
  const candidateIds = [
    ...new Set([bug.reporterId, ...authors.map(({ authorId }) => authorId)]),
  ];
  const clients = await transaction.orm.public.User.where((user) =>
    and(
      user.id.in(candidateIds),
      user.role.eq("client"),
      user.deactivatedAt.isNull()
    )
  )
    .select("id")
    .all();
  return clients.map(({ id }) => id);
};

export const assertCommentAllowed = (
  actor: { readonly role: string; readonly clientCompanyId: string | null },
  bug: {
    readonly clientCompanyId: string | null;
    readonly status: string;
  } | null,
  visibility: CommentVisibility
): void => {
  if (visibility === "public" && !bug?.clientCompanyId) {
    throw new AppError({
      code: "VALIDATION_FAILED",
      message: "Only comments on client bugs can be public.",
    });
  }
  if (actor.role !== "client") {
    return;
  }
  if (
    !bug ||
    !actor.clientCompanyId ||
    bug.clientCompanyId !== actor.clientCompanyId ||
    visibility !== "public"
  ) {
    throw new AppError({
      code: "NOT_FOUND",
      message: "The active task was not found.",
    });
  }
  if (COMPLETED_BUG_STATUSES.has(bug.status)) {
    throw forbidden("Closed bugs are read only.");
  }
};

// A client bug belongs to whoever picked it up: other employees follow along
// but do not comment.
export const assertHandlerMayComment = async (
  transaction: Transaction,
  actor: { readonly id: string; readonly role: string },
  taskId: string,
  bug: { readonly clientCompanyId: string | null } | null
): Promise<void> => {
  if (!bug?.clientCompanyId || actor.role !== "employee") {
    return;
  }
  const assignment = await transaction.orm.public.TaskAssignee.where({
    taskId,
    userId: actor.id,
  })
    .select("userId")
    .first();
  if (!assignment) {
    throw forbidden(
      "Only the assigned handler or an admin can comment on a client bug."
    );
  }
};

// Adds a comment and notifies the right people. Internal comments never reach
// a client; public comments are the only ones a client can see or write.

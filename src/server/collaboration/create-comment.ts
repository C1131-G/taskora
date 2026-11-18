import { randomUUID } from "node:crypto";

import { and } from "@prisma/orm-postgres/orm-client";
import { Effect, Schema } from "effect";

import { db } from "@/src/prisma/db";

import { AppError } from "../core/action-result";
import { LONG_TEXT_MAX_LENGTH } from "../core/text-limits";
import { notifyUsers } from "../notifications/notify-users";
import { enqueueWebhookEvent } from "../webhooks/webhook-enqueue";
import { markFirstResponse } from "../work/bug-sla";
import type { Transaction } from "./comment-guards";
import {
  assertCommentAllowed,
  assertHandlerMayComment,
  clientParticipantIds,
  forbidden,
} from "./comment-guards";
import type { CommentVisibility, CreatedComment } from "./contracts";
import { mapError, uuidSchema, extractMentionIds } from "./internal";

export const createCommentInTransaction = async (
  transaction: Transaction,
  input: {
    readonly actorId: string;
    readonly taskId: string;
    readonly body: string;
    readonly visibility: CommentVisibility;
    // Replaces the usual "replied to your bug report" client notice.
    readonly clientNotice?: string;
  }
): Promise<CreatedComment> => {
  const { actorId, taskId, visibility } = input;
  const body = input.body.trim();
  if (
    !Schema.is(uuidSchema)(taskId) ||
    !body ||
    body.length > LONG_TEXT_MAX_LENGTH
  ) {
    throw new AppError({
      code: "VALIDATION_FAILED",
      message: `Comments must contain 1 to ${LONG_TEXT_MAX_LENGTH.toLocaleString("en-US")} characters.`,
    });
  }
  const mentionIds = extractMentionIds(body);
  const actor = await transaction.orm.public.User.where({ id: actorId })
    .select(
      "role",
      "name",
      "mustChangePassword",
      "deactivatedAt",
      "clientCompanyId"
    )
    .first();
  if (!actor || actor.deactivatedAt) {
    throw new AppError({
      code: "UNAUTHENTICATED",
      message: "Sign in to continue.",
    });
  }
  if (actor.mustChangePassword) {
    throw forbidden("Change your password before continuing.");
  }
  const task = await transaction.orm.public.Task.where({
    archivedAt: null,
    id: taskId,
  })
    .select("createdById", "id", "projectId")
    .first();
  // Work in an archived project is read only, like an archived task.
  const project = task
    ? await transaction.orm.public.Project.where({
        archivedAt: null,
        id: task.projectId,
      })
        .select("id")
        .first()
    : null;
  if (!task || !project) {
    throw new AppError({
      code: "NOT_FOUND",
      message: "The active task was not found.",
    });
  }
  const bug = await transaction.orm.public.BugReport.where({ taskId })
    .select("id", "clientCompanyId", "reporterId", "status")
    .first();
  assertCommentAllowed(actor, bug, visibility);
  await assertHandlerMayComment(
    transaction,
    { id: actorId, role: actor.role },
    taskId,
    bug
  );
  if (mentionIds.length > 0) {
    const mentioned = await transaction.orm.public.User.where((user) =>
      and(
        user.id.in([...mentionIds]),
        user.deactivatedAt.isNull(),
        user.role.neq("client")
      )
    )
      .select("id")
      .all();
    if (mentioned.length !== mentionIds.length) {
      throw new AppError({
        code: "VALIDATION_FAILED",
        message: "A mentioned employee is not active.",
      });
    }
  }

  const id = randomUUID();
  const createdAt = new Date();
  await transaction.orm.public.Comment.create({
    authorId: actorId,
    body,
    createdAt,
    deletedAt: null,
    deletedById: null,
    id,
    taskId,
    updatedAt: createdAt,
    visibility,
  });
  await transaction.orm.public.Activity.create({
    action: "comment.created",
    actorId,
    createdAt,
    details: { commentId: id, visibility },
    id: randomUUID(),
    projectId: task.projectId,
    taskId,
  });
  // Ids and visibility only: the comment text never leaves the system.
  await enqueueWebhookEvent(transaction, "comment.added", {
    data: { id, projectId: task.projectId, taskId, visibility },
    now: createdAt,
  });
  if (visibility === "public" && actor.role !== "client" && bug) {
    // The team's first public reply answers the client.
    await markFirstResponse(transaction, bug.id, createdAt);
  }
  const snippet = body.slice(0, 240);
  const staffUrl = bug ? `/bugs/${bug.id}` : `/tasks/${taskId}`;
  await notifyUsers(transaction, {
    actorId,
    now: createdAt,
    projectId: task.projectId,
    recipientIds: mentionIds,
    snippet,
    taskId,
    text: `${actor.name} mentioned you`,
    type: "mention",
    url: `/tasks/${taskId}`,
  });
  const assignmentRows = await transaction.orm.public.TaskAssignee.where({
    taskId,
  })
    .select("userId")
    .all();
  const mentionedIds = new Set(mentionIds);
  const staffRecipients = [
    ...new Set([task.createdById, ...assignmentRows.map((row) => row.userId)]),
  ].filter((userId) => !mentionedIds.has(userId));
  // The reporter created the task, so on an internal comment they would
  // otherwise be told about a note they must never see.
  const staffUsers = await transaction.orm.public.User.where((user) =>
    and(user.id.in(staffRecipients), user.role.neq("client"))
  )
    .select("id")
    .all();
  const staffOnly = staffUsers.map(({ id: userId }) => userId);
  await notifyUsers(transaction, {
    actorId,
    now: createdAt,
    projectId: task.projectId,
    recipientIds: staffOnly,
    snippet,
    taskId,
    text: `${actor.name} commented on a task`,
    type: "comment",
    url: staffUrl,
  });
  if (visibility === "public" && bug) {
    const clientRecipients = await clientParticipantIds(transaction, {
      reporterId: bug.reporterId,
      taskId,
    });
    await notifyUsers(transaction, {
      actorId,
      now: createdAt,
      projectId: task.projectId,
      recipientIds: clientRecipients,
      snippet,
      taskId,
      text: input.clientNotice ?? `${actor.name} replied to your bug report`,
      type: "comment",
      url: `/portal/bugs/${bug.id}`,
    });
  }
  return {
    authorId: actorId,
    body,
    createdAt: createdAt.toISOString(),
    id,
    taskId,
    visibility,
  };
};

export const createComment = (
  actorId: string,
  taskId: string,
  body: string,
  visibility: CommentVisibility = "internal"
): Effect.Effect<CreatedComment, AppError> =>
  Effect.tryPromise({
    catch: mapError,
    try: () =>
      db.transaction((transaction) =>
        createCommentInTransaction(transaction, {
          actorId,
          body,
          taskId,
          visibility,
        })
      ),
  });

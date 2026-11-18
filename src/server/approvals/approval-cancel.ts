import { Effect } from "effect";

import { db } from "@/src/prisma/db";

import { AppError } from "../core/action-result";
import { mayWithdraw } from "./approval-rules";
import { forbidden, loadStaffActor, toError } from "./approval-write-support";

// Withdraws a request the client has not answered. The person who asked and
// administrators may do it; once the client decided it stays on record.
export const cancelApproval = (
  actorId: string,
  requestId: string
): Effect.Effect<void, AppError> =>
  Effect.tryPromise({
    catch: toError,
    try: () =>
      db.transaction(async (transaction) => {
        const [actor, request] = await Promise.all([
          loadStaffActor(transaction, actorId),
          transaction.orm.public.ApprovalRequest.where({
            id: requestId,
          }).first(),
        ]);
        if (!request) {
          throw new AppError({
            code: "NOT_FOUND",
            message: "The approval request was not found.",
          });
        }
        if (!mayWithdraw({ id: actorId, role: actor.role }, request)) {
          throw forbidden("You cannot cancel this approval request.");
        }
        const now = new Date();
        const changed = await transaction.orm.public.ApprovalRequest.where({
          id: requestId,
          status: "pending",
        }).updateAndCount({
          cancelledAt: now,
          cancelledById: actorId,
          status: "cancelled",
        });
        if (changed) {
          return;
        }
        // Cancelling twice is fine; cancelling a decided request is not.
        const current = await transaction.orm.public.ApprovalRequest.where({
          id: requestId,
        })
          .select("status")
          .first();
        if (current?.status !== "cancelled") {
          throw new AppError({
            code: "CONFLICT",
            message: "The client already answered this request.",
          });
        }
      }),
  });

import { AppError } from "../core/action-result";
import { isUniqueConstraintViolation } from "../core/prisma-errors";
import type { Transaction } from "../work/work-internal";
import { assertWorkspaceActor } from "../work/work-task-state";

export const invalid = (message: string) =>
  new AppError({ code: "VALIDATION_FAILED", message });

export const forbidden = (message: string) =>
  new AppError({ code: "FORBIDDEN", message });

export const toError = (error: unknown): AppError => {
  if (error instanceof AppError) {
    return error;
  }
  if (isUniqueConstraintViolation(error)) {
    return new AppError({
      code: "CONFLICT",
      message: "An approval was requested at the same time. Refresh and retry.",
    });
  }
  return new AppError({
    code: "UNAVAILABLE",
    message: "The approval request could not be completed.",
  });
};

export const loadStaffActor = async (
  transaction: Transaction,
  actorId: string
) => {
  const actor = await transaction.orm.public.User.where({ id: actorId })
    .select("name", "role", "mustChangePassword", "deactivatedAt")
    .first();
  assertWorkspaceActor(actor);
  if (actor.role === "client") {
    throw forbidden("Clients cannot request approvals.");
  }
  return actor;
};

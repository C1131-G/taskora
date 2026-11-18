import { randomUUID } from "node:crypto";

import { Effect } from "effect";

import { db } from "@/src/prisma/db";

import { AppError } from "../core/action-result";
import type { TimeEntryView } from "./time-report";
import type { Actor } from "./time-support";
import {
  isUuid,
  unavailable,
  notFound,
  requireWorkspaceUser,
  validateChanges,
  requireOpenTask,
  viewOf,
  checkBudget,
} from "./time-support";
import type { TimeEntryChanges, TimeEntryInput } from "./time-types";

export const addEntry = (actorId: string, input: TimeEntryInput) =>
  Effect.tryPromise({
    catch: unavailable,
    try: async (): Promise<TimeEntryView> => {
      await requireWorkspaceUser(actorId);
      validateChanges(input);
      await requireOpenTask(input.taskId);
      const now = new Date();
      const row = await db.orm.public.TimeEntry.create({
        billable: input.billable,
        createdAt: now,
        id: randomUUID(),
        minutes: input.minutes,
        note: input.note,
        taskId: input.taskId,
        updatedAt: now,
        userId: actorId,
        workDate: input.workDate,
      });
      await checkBudget(input.taskId, now);
      return await viewOf(row);
    },
  });

// People change their own entries; administrators may change anyone's.
const requireOwnEntry = async (actor: Actor, entryId: string) => {
  const entry = isUuid(entryId)
    ? await db.orm.public.TimeEntry.where({ id: entryId }).first()
    : null;
  if (!entry) {
    throw notFound("The time entry");
  }
  if (entry.userId !== actor.id && actor.role !== "admin") {
    throw new AppError({
      code: "FORBIDDEN",
      message: "You can only change your own time entries.",
    });
  }
  return entry;
};

export const updateEntry = (
  actorId: string,
  entryId: string,
  changes: TimeEntryChanges
) =>
  Effect.tryPromise({
    catch: unavailable,
    try: async (): Promise<TimeEntryView> => {
      const actor = await requireWorkspaceUser(actorId);
      validateChanges(changes);
      await requireOwnEntry(actor, entryId);
      const row = await db.orm.public.TimeEntry.where({ id: entryId }).update({
        billable: changes.billable,
        minutes: changes.minutes,
        note: changes.note,
        updatedAt: new Date(),
        workDate: changes.workDate,
      });
      if (!row) {
        throw notFound("The time entry");
      }
      await checkBudget(row.taskId, new Date());
      return await viewOf(row);
    },
  });

export const deleteEntry = (actorId: string, entryId: string) =>
  Effect.tryPromise({
    catch: unavailable,
    try: async (): Promise<void> => {
      const actor = await requireWorkspaceUser(actorId);
      await requireOwnEntry(actor, entryId);
      await db.orm.public.TimeEntry.where({ id: entryId }).delete();
    },
  });

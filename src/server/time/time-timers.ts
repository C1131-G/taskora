import { randomUUID } from "node:crypto";

import { Effect } from "effect";

import { db } from "@/src/prisma/db";

import { AppError } from "../core/action-result";
import type { TimeEntryView } from "./time-report";
import {
  MAX_ENTRY_MINUTES,
  MAX_NOTE_LENGTH,
  MS_PER_MINUTE,
  unavailable,
  invalid,
  notFound,
  requireWorkspaceUser,
  requireOpenTask,
  loadTaskLabels,
  viewOf,
  checkBudget,
  companyDate,
} from "./time-support";
import type { RunningTimer, StartTimerInput, StartedTimer } from "./time-types";

interface TimerRow {
  readonly billable: boolean;
  readonly note: string | null;
  readonly startedAt: Date;
  readonly taskId: string;
  readonly userId: string;
}

// Turns the running timer into a saved entry and clears it. A few seconds
// still count as a minute, and one entry never exceeds a day.
const saveTimer = async (
  timer: TimerRow,
  now: Date
): Promise<TimeEntryView> => {
  const elapsed = Math.ceil(
    (now.getTime() - timer.startedAt.getTime()) / MS_PER_MINUTE
  );
  const row = await db.transaction(async (transaction) => {
    // Only the request that actually removes the timer may save its entry, so
    // two stops (or a stop and a start) racing for the same timer save one.
    const removed = await transaction.orm.public.TimeTimer.where({
      startedAt: timer.startedAt,
      userId: timer.userId,
    }).deleteAndCount();
    if (removed === 0) {
      throw new AppError({
        code: "CONFLICT",
        message: "This timer was already stopped.",
      });
    }
    return await transaction.orm.public.TimeEntry.create({
      billable: timer.billable,
      createdAt: now,
      id: randomUUID(),
      minutes: Math.min(Math.max(elapsed, 1), MAX_ENTRY_MINUTES),
      note: timer.note,
      taskId: timer.taskId,
      updatedAt: now,
      userId: timer.userId,
      workDate: await companyDate(timer.startedAt),
    });
  });
  await checkBudget(timer.taskId, now);
  const view = await viewOf(row);
  const droppedMinutes = Math.max(elapsed - MAX_ENTRY_MINUTES, 0);
  return droppedMinutes > 0 ? { ...view, droppedMinutes } : view;
};

const timerView = async (timer: TimerRow): Promise<RunningTimer> => {
  const labels = await loadTaskLabels([timer.taskId]);
  const label = labels.get(timer.taskId);
  return {
    billable: timer.billable,
    note: timer.note,
    startedAt: timer.startedAt.toISOString(),
    taskId: timer.taskId,
    taskReference: label?.reference ?? "",
    taskTitle: label?.title ?? "",
  };
};

export const startTimer = (
  actorId: string,
  input: StartTimerInput,
  now: Date
) =>
  Effect.tryPromise({
    catch: unavailable,
    try: async (): Promise<StartedTimer> => {
      await requireWorkspaceUser(actorId);
      if (input.note !== null && input.note.length > MAX_NOTE_LENGTH) {
        throw invalid("note", "Keep the note under 500 characters.");
      }
      await requireOpenTask(input.taskId);
      const current = await db.orm.public.TimeTimer.where({
        userId: actorId,
      }).first();
      if (current?.taskId === input.taskId) {
        return { stopped: null, timer: await timerView(current) };
      }
      const stopped = current ? await saveTimer(current, now) : null;
      const created = await db.orm.public.TimeTimer.create({
        billable: input.billable,
        note: input.note,
        startedAt: now,
        taskId: input.taskId,
        userId: actorId,
      });
      return { stopped, timer: await timerView(created) };
    },
  });

export const stopTimer = (actorId: string, now: Date) =>
  Effect.tryPromise({
    catch: unavailable,
    try: async (): Promise<TimeEntryView> => {
      await requireWorkspaceUser(actorId);
      const current = await db.orm.public.TimeTimer.where({
        userId: actorId,
      }).first();
      if (!current) {
        throw notFound("A running timer");
      }
      return await saveTimer(current, now);
    },
  });

export const runningTimer = (actorId: string) =>
  Effect.tryPromise({
    catch: unavailable,
    try: async (): Promise<RunningTimer | null> => {
      await requireWorkspaceUser(actorId);
      const current = await db.orm.public.TimeTimer.where({
        userId: actorId,
      }).first();
      return current ? await timerView(current) : null;
    },
  });

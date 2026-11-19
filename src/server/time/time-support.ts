import { Schema } from "effect";

import { db } from "@/src/prisma/db";

import { enqueueBudgetEvaluation } from "../budgets/budget-alerts";
import { AppError } from "../core/action-result";
import { CalendarDateSchema, UUIDSchema } from "../core/input-schemas";
import { isUniqueConstraintViolation } from "../core/prisma-errors";
import type { TimeEntryView } from "./time-report";
import type { TimeEntryChanges } from "./time-types";

export const MAX_ENTRY_MINUTES = 1440;
export const MAX_NOTE_LENGTH = 500;
export const MS_PER_MINUTE = 60_000;
export const MAX_REPORT_ROWS = 20_000;
export const MAX_TASK_OPTIONS = 100;
export const MAX_REPORT_DAYS = 366;
export const DEFAULT_TIME_ZONE = "UTC";

export const isUuid = Schema.is(UUIDSchema);
export const isCalendarDate = Schema.is(CalendarDateSchema);

export const unavailable = (error: unknown): AppError => {
  if (error instanceof AppError) {
    return error;
  }
  // A second timer for the same person is refused by the table's key.
  if (isUniqueConstraintViolation(error)) {
    return new AppError({
      code: "CONFLICT",
      message: "A timer is already running.",
    });
  }
  return new AppError({
    code: "UNAVAILABLE",
    message: "Time could not be loaded or saved.",
  });
};

export const invalid = (field: string, message: string): AppError =>
  new AppError({ code: "VALIDATION_FAILED", field, message });

export const notFound = (what: string): AppError =>
  new AppError({ code: "NOT_FOUND", message: `${what} was not found.` });

export interface Actor {
  readonly id: string;
  readonly role: "admin" | "employee";
}

// Same gate as the task pages. Clients never reach internal time data.
export const requireWorkspaceUser = async (actorId: string): Promise<Actor> => {
  const actor = await db.orm.public.User.where({ id: actorId })
    .select("deactivatedAt", "mustChangePassword", "role")
    .first();
  if (!actor || actor.deactivatedAt || actor.role === "client") {
    throw new AppError({
      code: "UNAUTHENTICATED",
      message: "Sign in to continue.",
    });
  }
  if (actor.mustChangePassword) {
    throw new AppError({
      code: "FORBIDDEN",
      message: "Change your password before continuing.",
    });
  }
  return { id: actorId, role: actor.role === "admin" ? "admin" : "employee" };
};

export const validateChanges = (changes: TimeEntryChanges): void => {
  if (
    !Number.isInteger(changes.minutes) ||
    changes.minutes < 1 ||
    changes.minutes > MAX_ENTRY_MINUTES
  ) {
    throw invalid("minutes", "Enter whole minutes between 1 and 1440.");
  }
  if (!isCalendarDate(changes.workDate)) {
    throw invalid("workDate", "Enter a real date.");
  }
  if (changes.note !== null && changes.note.length > MAX_NOTE_LENGTH) {
    throw invalid("note", "Keep the note under 500 characters.");
  }
};

export const requireOpenTask = async (taskId: string): Promise<void> => {
  const task = isUuid(taskId)
    ? await db.orm.public.Task.where({ id: taskId })
        .select("archivedAt", "projectId")
        .first()
    : null;
  if (!task) {
    throw notFound("The task");
  }
  const project = await db.orm.public.Project.where({ id: task.projectId })
    .select("archivedAt")
    .first();
  if (task.archivedAt || project?.archivedAt) {
    throw new AppError({
      code: "FORBIDDEN",
      message: "Time cannot be logged on archived work.",
    });
  }
};

export interface TaskLabel {
  readonly projectId: string;
  readonly reference: string;
  readonly title: string;
}

export const loadTaskLabels = async (
  taskIds: readonly string[]
): Promise<ReadonlyMap<string, TaskLabel>> => {
  if (taskIds.length === 0) {
    return new Map();
  }
  const tasks = await db.orm.public.Task.where((task) =>
    task.id.in([...new Set(taskIds)])
  )
    .select("id", "projectId", "projectTaskNumber", "title")
    .all();
  const projects = await db.orm.public.Project.where((project) =>
    project.id.in([...new Set(tasks.map(({ projectId }) => projectId))])
  )
    .select("id", "key")
    .all();
  const keys = new Map(projects.map(({ id, key }) => [id, key]));
  return new Map(
    tasks.map((task) => [
      task.id,
      {
        projectId: task.projectId,
        reference: `${keys.get(task.projectId) ?? ""}-${task.projectTaskNumber}`,
        title: task.title,
      },
    ])
  );
};

export interface EntryRow {
  readonly billable: boolean;
  readonly id: string;
  readonly minutes: number;
  readonly note: string | null;
  readonly taskId: string;
  readonly userId: string;
  readonly workDate: string;
}

export const toViews = async (
  rows: readonly EntryRow[]
): Promise<readonly TimeEntryView[]> => {
  const labels = await loadTaskLabels(rows.map(({ taskId }) => taskId));
  const userIds = [...new Set(rows.map(({ userId }) => userId))];
  const users =
    userIds.length === 0
      ? []
      : await db.orm.public.User.where((user) => user.id.in(userIds))
          .select("id", "name")
          .all();
  const names = new Map(users.map(({ id, name }) => [id, name]));
  return rows.map((row) => ({
    billable: row.billable,
    id: row.id,
    minutes: row.minutes,
    note: row.note,
    taskId: row.taskId,
    taskReference: labels.get(row.taskId)?.reference ?? "",
    taskTitle: labels.get(row.taskId)?.title ?? "",
    userId: row.userId,
    userName: names.get(row.userId) ?? "",
    workDate: row.workDate,
  }));
};

export const viewOf = async (row: EntryRow): Promise<TimeEntryView> => {
  const [view] = await toViews([row]);
  if (!view) {
    throw notFound("The time entry");
  }
  return view;
};

// Logging time can cross a project's budget threshold. The entry is already
// saved and the check is queued as a job, so a failure here must not fail the
// person's time.
export const checkBudget = async (taskId: string, now: Date): Promise<void> => {
  try {
    const task = await db.orm.public.Task.where({ id: taskId })
      .select("projectId")
      .first();
    if (task) {
      await enqueueBudgetEvaluation(task.projectId, now);
    }
  } catch {
    // The next logged entry evaluates the budget again.
  }
};

export const companyDate = async (at: Date): Promise<string> => {
  const settings = await db.orm.public.CompanySettings.where({ id: "company" })
    .select("timeZone")
    .first();
  // en-CA formats a date as YYYY-MM-DD.
  return at.toLocaleDateString("en-CA", {
    day: "2-digit",
    month: "2-digit",
    timeZone: settings?.timeZone ?? DEFAULT_TIME_ZONE,
    year: "numeric",
  });
};

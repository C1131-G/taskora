import { and } from "@prisma/orm-postgres/orm-client";
import { Effect } from "effect";

import { db } from "@/src/prisma/db";

import { AppError } from "../core/action-result";
import {
  addDays,
  buildProjectReport,
  formatTimeCsv,
  sumMinutes,
  weekDates,
  weekStartOf,
} from "./time-report";
import type { ProjectTimeReport, TimeEntryView } from "./time-report";
import {
  MAX_REPORT_ROWS,
  MAX_TASK_OPTIONS,
  MAX_REPORT_DAYS,
  isUuid,
  isCalendarDate,
  unavailable,
  invalid,
  notFound,
  requireWorkspaceUser,
  loadTaskLabels,
  toViews,
} from "./time-support";
import type { DateRange, TaskOption, TaskTime, WeeklyTime } from "./time-types";

export const taskTime = (actorId: string, taskId: string) =>
  Effect.tryPromise({
    catch: unavailable,
    try: async (): Promise<TaskTime> => {
      await requireWorkspaceUser(actorId);
      if (!isUuid(taskId)) {
        throw notFound("The task");
      }
      const rows = await db.orm.public.TimeEntry.where({ taskId })
        .orderBy((entry) => entry.workDate.desc())
        .limit(MAX_REPORT_ROWS)
        .all();
      const entries = await toViews(rows);
      return { ...sumMinutes(entries), entries };
    },
  });

export const weeklyTime = (actorId: string, date: string) =>
  Effect.tryPromise({
    catch: unavailable,
    try: async (): Promise<WeeklyTime> => {
      await requireWorkspaceUser(actorId);
      if (!isCalendarDate(date)) {
        throw invalid("weekStart", "Enter a real date.");
      }
      const weekStart = weekStartOf(date);
      const weekEnd = addDays(weekStart, 6);
      const rows = await db.orm.public.TimeEntry.where((entry) =>
        and(
          entry.userId.eq(actorId),
          entry.workDate.gte(weekStart),
          entry.workDate.lte(weekEnd)
        )
      )
        .orderBy((entry) => entry.workDate.asc())
        .orderBy((entry) => entry.createdAt.asc())
        .all();
      const entries = await toViews(rows);
      return {
        ...sumMinutes(entries),
        days: weekDates(weekStart).map((day) => ({
          date: day,
          minutes: entries
            .filter((entry) => entry.workDate === day)
            .reduce((sum, entry) => sum + entry.minutes, 0),
        })),
        entries,
        weekStart,
      };
    },
  });

// Open tasks assigned to the person, the ones they are most likely to log time on.
export const assignedTasks = (actorId: string) =>
  Effect.tryPromise({
    catch: unavailable,
    try: async (): Promise<readonly TaskOption[]> => {
      await requireWorkspaceUser(actorId);
      const assignments = await db.orm.public.TaskAssignee.where({
        userId: actorId,
      })
        .select("taskId")
        .all();
      if (assignments.length === 0) {
        return [];
      }
      const tasks = await db.orm.public.Task.where((task) =>
        and(
          task.id.in(assignments.map(({ taskId }) => taskId)),
          task.archivedAt.isNull(),
          task.status.neq("done")
        )
      )
        .select("id")
        .orderBy((task) => task.updatedAt.desc())
        .limit(MAX_TASK_OPTIONS)
        .all();
      const labels = await loadTaskLabels(tasks.map(({ id }) => id));
      return tasks.flatMap(({ id }) => {
        const label = labels.get(id);
        return label
          ? [{ reference: label.reference, taskId: id, title: label.title }]
          : [];
      });
    },
  });

const validateRange = (range: DateRange): void => {
  if (!isCalendarDate(range.from) || !isCalendarDate(range.to)) {
    throw invalid("from", "Enter real dates.");
  }
  if (range.from > range.to) {
    throw invalid("from", "The start date must be on or before the end date.");
  }
  if (addDays(range.from, MAX_REPORT_DAYS) < range.to) {
    throw invalid("to", "Report on at most a year at a time.");
  }
};

// Administrators and members of the project may read its time.
const loadProjectEntries = async (
  actorId: string,
  projectId: string,
  range: DateRange
): Promise<readonly TimeEntryView[]> => {
  const actor = await requireWorkspaceUser(actorId);
  validateRange(range);
  const project = isUuid(projectId)
    ? await db.orm.public.Project.where({ id: projectId }).select("id").first()
    : null;
  if (!project) {
    throw notFound("The project");
  }
  if (actor.role !== "admin") {
    const membership = await db.orm.public.ProjectMember.where({
      projectId,
      userId: actorId,
    }).first();
    if (!membership) {
      throw new AppError({
        code: "FORBIDDEN",
        message:
          "Only administrators and project members can see project time.",
      });
    }
  }
  const tasks = await db.orm.public.Task.where({ projectId })
    .select("id")
    .all();
  if (tasks.length === 0) {
    return [];
  }
  const rows = await db.orm.public.TimeEntry.where((entry) =>
    and(
      entry.taskId.in(tasks.map(({ id }) => id)),
      entry.workDate.gte(range.from),
      entry.workDate.lte(range.to)
    )
  )
    .orderBy((entry) => entry.workDate.asc())
    .limit(MAX_REPORT_ROWS)
    .all();
  return await toViews(rows);
};

export const projectReport = (
  actorId: string,
  projectId: string,
  range: DateRange
) =>
  Effect.tryPromise({
    catch: unavailable,
    try: async (): Promise<ProjectTimeReport> =>
      buildProjectReport(
        await loadProjectEntries(actorId, projectId, range),
        range
      ),
  });

export const projectReportCsv = (
  actorId: string,
  projectId: string,
  range: DateRange
) =>
  Effect.tryPromise({
    catch: unavailable,
    try: async (): Promise<string> =>
      formatTimeCsv(await loadProjectEntries(actorId, projectId, range)),
  });

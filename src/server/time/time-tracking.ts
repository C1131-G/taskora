import type { Effect } from "effect";
import { Context, Layer } from "effect";

import type { AppError } from "../core/action-result";
import { addEntry, deleteEntry, updateEntry } from "./time-entries";
import type { ProjectTimeReport, TimeEntryView } from "./time-report";
import {
  assignedTasks,
  projectReport,
  projectReportCsv,
  taskTime,
  weeklyTime,
} from "./time-reports";
import { runningTimer, startTimer, stopTimer } from "./time-timers";
import type {
  DateRange,
  RunningTimer,
  StartTimerInput,
  StartedTimer,
  TaskOption,
  TaskTime,
  TimeEntryChanges,
  TimeEntryInput,
  WeeklyTime,
} from "./time-types";

export class TimeTracking extends Context.Service<
  TimeTracking,
  {
    readonly startTimer: (
      actorId: string,
      input: StartTimerInput,
      now: Date
    ) => Effect.Effect<StartedTimer, AppError>;
    readonly stopTimer: (
      actorId: string,
      now: Date
    ) => Effect.Effect<TimeEntryView, AppError>;
    readonly runningTimer: (
      actorId: string
    ) => Effect.Effect<RunningTimer | null, AppError>;
    readonly addEntry: (
      actorId: string,
      input: TimeEntryInput
    ) => Effect.Effect<TimeEntryView, AppError>;
    readonly updateEntry: (
      actorId: string,
      entryId: string,
      changes: TimeEntryChanges
    ) => Effect.Effect<TimeEntryView, AppError>;
    readonly deleteEntry: (
      actorId: string,
      entryId: string
    ) => Effect.Effect<void, AppError>;
    readonly taskTime: (
      actorId: string,
      taskId: string
    ) => Effect.Effect<TaskTime, AppError>;
    readonly weeklyTime: (
      actorId: string,
      date: string
    ) => Effect.Effect<WeeklyTime, AppError>;
    readonly assignedTasks: (
      actorId: string
    ) => Effect.Effect<readonly TaskOption[], AppError>;
    readonly projectReport: (
      actorId: string,
      projectId: string,
      range: DateRange
    ) => Effect.Effect<ProjectTimeReport, AppError>;
    readonly projectReportCsv: (
      actorId: string,
      projectId: string,
      range: DateRange
    ) => Effect.Effect<string, AppError>;
  }
>()("taskora/server/TimeTracking") {}

export const TimeTrackingLive = Layer.succeed(TimeTracking, {
  addEntry,
  assignedTasks,
  deleteEntry,
  projectReport,
  projectReportCsv,
  runningTimer,
  startTimer,
  stopTimer,
  taskTime,
  updateEntry,
  weeklyTime,
});

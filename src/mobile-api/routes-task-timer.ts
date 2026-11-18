import { Schema } from "effect";

import type { RouteDefinition } from "./route-definition";
import { IdSchema } from "./routes-task-fields";

const TimerNoteSchema = Schema.NullOr(
  Schema.String.check(Schema.isMaxLength(500))
);

export const RunningTimerSchema = Schema.Struct({
  billable: Schema.Boolean,
  note: TimerNoteSchema,
  startedAt: Schema.String,
  taskId: Schema.String,
  taskReference: Schema.String,
  taskTitle: Schema.String,
});

export const TimeEntryViewSchema = Schema.Struct({
  billable: Schema.Boolean,
  id: Schema.String,
  minutes: Schema.Number,
  note: TimerNoteSchema,
  taskId: Schema.String,
  taskReference: Schema.String,
  taskTitle: Schema.String,
  userId: Schema.String,
  userName: Schema.String,
  workDate: Schema.String,
});

export type MobileTimeEntryView = typeof TimeEntryViewSchema.Type;

export const StartedTimerSchema = Schema.Struct({
  stopped: Schema.NullOr(TimeEntryViewSchema),
  timer: RunningTimerSchema,
});

export type MobileStartedTimer = typeof StartedTimerSchema.Type;

export const MyTimerSchema = Schema.Struct({
  timer: Schema.NullOr(RunningTimerSchema),
});

export type MobileMyTimer = typeof MyTimerSchema.Type;

export const StartTimerBodySchema = Schema.Struct({
  billable: Schema.Boolean,
  note: Schema.optional(TimerNoteSchema),
  taskId: IdSchema,
});

export type MobileStartTimerBody = typeof StartTimerBodySchema.Type;

export const myTimerRoute = {
  data: MyTimerSchema,
  method: "get",
  operationId: "getMyTimer",
  path: "/api/v1/workspace/me/timer",
  summary: "The caller's running timer, or null when no timer is running.",
} as const satisfies RouteDefinition;

export const startMyTimerRoute = {
  body: StartTimerBodySchema,
  data: StartedTimerSchema,
  method: "post",
  operationId: "startMyTimer",
  path: "/api/v1/workspace/me/timer/start",
  summary:
    "Start the caller's timer on an open task, saving the timer that was running before.",
} as const satisfies RouteDefinition;

export const stopMyTimerRoute = {
  data: TimeEntryViewSchema,
  method: "post",
  operationId: "stopMyTimer",
  path: "/api/v1/workspace/me/timer/stop",
  summary:
    "Stop the caller's timer and save its time as an entry. Answers 404 when none is running.",
} as const satisfies RouteDefinition;

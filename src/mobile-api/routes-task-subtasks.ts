import { Schema } from "effect";

import type { RouteDefinition } from "./route-definition";
import {
  CalendarDayText,
  ExpectedVersionSchema,
  IdSchema,
  SubtaskSchema,
  TaskPathSchema,
} from "./routes-task-fields";

export const SubtaskResultSchema = Schema.Struct({
  parentVersion: Schema.Number,
  subtask: SubtaskSchema,
});

export type MobileSubtaskResult = typeof SubtaskResultSchema.Type;

const SubtaskTextSchema = Schema.String.check(Schema.isMaxLength(240));

export const SubtaskAddBodySchema = Schema.Struct({
  assigneeId: Schema.optional(Schema.NullOr(IdSchema)),
  description: Schema.optional(Schema.NullOr(Schema.String)),
  dueDate: Schema.optional(Schema.NullOr(CalendarDayText)),
  expectedVersion: ExpectedVersionSchema,
  title: SubtaskTextSchema,
});

export type MobileSubtaskAddBody = typeof SubtaskAddBodySchema.Type;

export const subtaskAddRoute = {
  body: SubtaskAddBodySchema,
  data: SubtaskResultSchema,
  method: "post",
  operationId: "addSubtask",
  params: TaskPathSchema,
  path: "/api/v1/workspace/tasks/{taskId}/subtasks",
  summary:
    "Add a subtask to a task the caller may edit. Answers with the task's new version.",
} as const satisfies RouteDefinition;

export const SubtaskChangeBodySchema = Schema.Struct({
  assigneeId: Schema.optional(Schema.NullOr(IdSchema)),
  completed: Schema.optional(Schema.Boolean),
  description: Schema.optional(Schema.NullOr(Schema.String)),
  dueDate: Schema.optional(Schema.NullOr(CalendarDayText)),
  expectedVersion: ExpectedVersionSchema,
  title: Schema.optional(SubtaskTextSchema),
});

export type MobileSubtaskChangeBody = typeof SubtaskChangeBodySchema.Type;

export const subtaskChangeRoute = {
  body: SubtaskChangeBodySchema,
  data: SubtaskResultSchema,
  method: "patch",
  operationId: "changeSubtask",
  params: Schema.Struct({ subtaskId: IdSchema, taskId: IdSchema }),
  path: "/api/v1/workspace/tasks/{taskId}/subtasks/{subtaskId}",
  summary:
    "Update or toggle a subtask of a task the caller may edit. Fields left out keep their value.",
} as const satisfies RouteDefinition;

export const SubtaskStatusBodySchema = Schema.Struct({
  done: Schema.Boolean,
  expectedVersion: ExpectedVersionSchema,
});

export type MobileSubtaskStatusBody = typeof SubtaskStatusBodySchema.Type;

export const SubtaskStatusResultSchema = Schema.Struct({
  done: Schema.Boolean,
  version: Schema.Number,
});

export type MobileSubtaskStatus = typeof SubtaskStatusResultSchema.Type;

export const subtaskStatusRoute = {
  body: SubtaskStatusBodySchema,
  data: SubtaskStatusResultSchema,
  method: "post",
  operationId: "setSubtaskStatus",
  params: Schema.Struct({ subtaskId: IdSchema, taskId: IdSchema }),
  path: "/api/v1/workspace/tasks/{taskId}/subtasks/{subtaskId}/status",
  summary:
    "Mark a subtask done or not done. Needs the task version the caller last saw; a stale one answers 409.",
} as const satisfies RouteDefinition;

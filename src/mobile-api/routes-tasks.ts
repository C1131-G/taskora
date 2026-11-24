import { Schema } from "effect";

import type { RouteDefinition } from "./route-definition";
import { NextCursorSchema, PageQuerySchema } from "./routes-paging";
import {
  CalendarDayText,
  ExpectedVersionSchema,
  IdSchema,
  SubtaskSchema,
  TaskPathSchema,
} from "./routes-task-fields";
import {
  subtaskAddRoute,
  subtaskChangeRoute,
  subtaskStatusRoute,
} from "./routes-task-subtasks";
import {
  myTimerRoute,
  startMyTimerRoute,
  stopMyTimerRoute,
} from "./routes-task-timer";
import { TaskStatusSchema } from "./task-statuses";

// Task actions: context, quick updates, discussions, subtasks, own timer.
// Owned by one branch, so adding routes here never conflicts with the others.

export const TaskPrioritySchema = Schema.Literals([
  "urgent",
  "high",
  "medium",
  "low",
  "none",
]);

const MY_WORK_MAX_PAGE_SIZE = 50;

const MyWorkItemSchema = Schema.Struct({
  dueDate: Schema.NullOr(Schema.String),
  id: Schema.String,
  isOverdue: Schema.Boolean,
  priority: TaskPrioritySchema,
  projectId: Schema.String,
  projectName: Schema.String,
  reference: Schema.String,
  status: TaskStatusSchema,
  title: Schema.String,
  version: Schema.Number,
});

const MyWorkSchema = Schema.Struct({
  items: Schema.Array(MyWorkItemSchema),
  nextOffset: Schema.NullOr(Schema.Number),
});

export type MobileMyWork = typeof MyWorkSchema.Type;

export const myWorkRoute = {
  data: MyWorkSchema,
  method: "get",
  operationId: "getMyWork",
  path: "/api/v1/workspace/me/work",
  query: Schema.Struct({
    limit: Schema.optional(
      Schema.FiniteFromString.check(
        Schema.isInt(),
        Schema.isBetween({ maximum: MY_WORK_MAX_PAGE_SIZE, minimum: 1 })
      )
    ),
    offset: Schema.optional(
      Schema.FiniteFromString.check(
        Schema.isInt(),
        Schema.isGreaterThanOrEqualTo(0)
      )
    ),
    scope: Schema.optional(Schema.Literals(["assigned", "due", "overdue"])),
  }),
  summary:
    "Open tasks assigned to the caller: all of them, those due today or earlier, or only the overdue ones.",
} as const satisfies RouteDefinition;

const TaskActionSchema = Schema.Literals([
  "update",
  "manageSubtasks",
  "comment",
  "trackTime",
]);

const DiscussionEntrySchema = Schema.Struct({
  authorId: Schema.String,
  authorName: Schema.String,
  body: Schema.String,
  createdAt: Schema.String,
  id: Schema.String,
  visibility: Schema.Literals(["public", "internal"]),
});

const TaskContextSchema = Schema.Struct({
  assignees: Schema.Array(
    Schema.Struct({ id: Schema.String, name: Schema.String })
  ),
  createdById: Schema.String,
  description: Schema.NullOr(Schema.String),
  discussion: Schema.Array(DiscussionEntrySchema),
  dueDate: Schema.NullOr(Schema.String),
  id: Schema.String,
  isArchived: Schema.Boolean,
  permittedActions: Schema.Array(TaskActionSchema),
  priority: TaskPrioritySchema,
  projectId: Schema.String,
  projectName: Schema.String,
  reference: Schema.String,
  startDate: Schema.NullOr(Schema.String),
  status: TaskStatusSchema,
  subtasks: Schema.Array(SubtaskSchema),
  title: Schema.String,
  type: Schema.Literals(["task", "bug"]),
  version: Schema.Number,
});

export type MobileTaskContext = typeof TaskContextSchema.Type;

export const taskContextRoute = {
  data: TaskContextSchema,
  method: "get",
  operationId: "getTaskContext",
  params: TaskPathSchema,
  path: "/api/v1/workspace/tasks/{taskId}",
  summary:
    "One task with its assignees, subtasks, discussion, version and what the caller may do with it.",
} as const satisfies RouteDefinition;

// What a quick change or a create answers with: the task's new state and the
// version the next write must send.
export const TaskChangeSchema = Schema.Struct({
  assigneeIds: Schema.Array(Schema.String),
  dueDate: Schema.NullOr(Schema.String),
  id: Schema.String,
  priority: TaskPrioritySchema,
  projectId: Schema.String,
  reference: Schema.String,
  status: TaskStatusSchema,
  title: Schema.String,
  version: Schema.Number,
});

export type MobileTaskChange = typeof TaskChangeSchema.Type;

const TaskChangeBodySchema = Schema.Struct({
  assigneeIds: Schema.optional(
    Schema.Array(IdSchema).check(Schema.isMaxLength(100))
  ),
  dueDate: Schema.optional(Schema.NullOr(CalendarDayText)),
  expectedVersion: ExpectedVersionSchema,
  priority: Schema.optional(TaskPrioritySchema),
  status: Schema.optional(TaskStatusSchema),
});

export type MobileTaskChangeBody = typeof TaskChangeBodySchema.Type;

export const taskChangeRoute = {
  body: TaskChangeBodySchema,
  data: TaskChangeSchema,
  method: "patch",
  operationId: "changeTask",
  params: TaskPathSchema,
  path: "/api/v1/workspace/tasks/{taskId}",
  summary:
    "Change a task's status, priority, due date or assignees. Needs the version the caller last saw; a stale one answers 409.",
} as const satisfies RouteDefinition;

const TaskCreateBodySchema = Schema.Struct({
  assigneeIds: Schema.Array(IdSchema).check(Schema.isMaxLength(100)),
  description: Schema.optional(Schema.NullOr(Schema.String)),
  dueDate: Schema.optional(Schema.NullOr(CalendarDayText)),
  priority: Schema.optional(TaskPrioritySchema),
  projectId: IdSchema,
  title: Schema.String,
});

export type MobileTaskCreateBody = typeof TaskCreateBodySchema.Type;

export const taskCreateRoute = {
  body: TaskCreateBodySchema,
  data: TaskChangeSchema,
  method: "post",
  operationId: "createTask",
  path: "/api/v1/workspace/tasks",
  summary:
    "Create a task in an active project and assign it. Admins and employees follow the same rules as the web.",
} as const satisfies RouteDefinition;

const TaskCommentVisibilitySchema = Schema.Literals(["public", "internal"]);

const TaskCommentBodySchema = Schema.Struct({
  body: Schema.String,
  visibility: Schema.optional(TaskCommentVisibilitySchema),
});

export type MobileTaskCommentBody = typeof TaskCommentBodySchema.Type;

export const TaskCommentSchema = Schema.Struct({
  authorId: Schema.String,
  body: Schema.String,
  createdAt: Schema.String,
  id: Schema.String,
  taskId: Schema.String,
  visibility: TaskCommentVisibilitySchema,
});

export type MobileTaskComment = typeof TaskCommentSchema.Type;

export const taskCommentRoute = {
  body: TaskCommentBodySchema,
  data: TaskCommentSchema,
  method: "post",
  operationId: "addTaskComment",
  params: TaskPathSchema,
  path: "/api/v1/workspace/tasks/{taskId}/comments",
  summary:
    "Add a comment to a task. It is internal unless the caller makes a public reply on a client bug.",
} as const satisfies RouteDefinition;

const TaskListItemSchema = Schema.Struct({
  assigneeIds: Schema.Array(Schema.String),
  assigneeNames: Schema.Array(Schema.String),
  dueDate: Schema.NullOr(Schema.String),
  id: Schema.String,
  priority: TaskPrioritySchema,
  projectId: Schema.String,
  projectName: Schema.String,
  reference: Schema.String,
  status: TaskStatusSchema,
  title: Schema.String,
  version: Schema.Number,
});

const TaskListSchema = Schema.Struct({
  items: Schema.Array(TaskListItemSchema),
  nextCursor: NextCursorSchema,
});

export type MobileTaskList = typeof TaskListSchema.Type;

export const taskListRoute = {
  data: TaskListSchema,
  method: "get",
  operationId: "listTasks",
  path: "/api/v1/workspace/tasks",
  query: Schema.Struct({
    ...PageQuerySchema.fields,
    mine: Schema.optional(Schema.Literals(["true", "false"])),
    projectId: Schema.optional(IdSchema),
    status: Schema.optional(TaskStatusSchema),
  }),
  summary:
    "The workspace's open tasks, newest first, one page at a time. Bugs and archived tasks are left out; filter by project, status or the caller's own assignments.",
} as const satisfies RouteDefinition;

export const taskRoutes = [
  taskListRoute,
  myWorkRoute,
  taskContextRoute,
  taskChangeRoute,
  taskCreateRoute,
  subtaskAddRoute,
  subtaskChangeRoute,
  subtaskStatusRoute,
  taskCommentRoute,
  myTimerRoute,
  startMyTimerRoute,
  stopMyTimerRoute,
] as const satisfies readonly RouteDefinition[];

import { Schema } from "effect";

// The task status vocabulary shared by the server, the web app and the mobile
// app: one ordered list and one label per status.

export const TASK_STATUS_ORDER = [
  "backlog",
  "todo",
  "progress",
  "review",
  "done",
] as const;

export type TaskStatusId = (typeof TASK_STATUS_ORDER)[number];

export const TaskStatusSchema = Schema.Literals(TASK_STATUS_ORDER);

export const TASK_STATUS_LABELS = {
  backlog: "Backlog",
  done: "Done",
  progress: "In Progress",
  review: "Review",
  todo: "To Do",
} as const satisfies Readonly<Record<TaskStatusId, string>>;

/** Every status in board order, with its label. */
export const TASK_STATUSES = TASK_STATUS_ORDER.map((id) => ({
  id,
  label: TASK_STATUS_LABELS[id],
}));

/** The label for a status; an unknown value is shown as it is. */
export const taskStatusLabel = (status: string): string =>
  Schema.is(TaskStatusSchema)(status) ? TASK_STATUS_LABELS[status] : status;

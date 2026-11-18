import { expect, it } from "bun:test";

import { groupTasksByDueDate } from "@/features/tasks/global-task-grouping";
import {
  TASK_STATUS_ORDER,
  TASK_STATUSES,
  taskStatusLabel,
} from "@/src/mobile-api/task-statuses";
import { isOverdue } from "@/src/server/work/work-overdue";

it("counts only open tasks due before the company day as overdue", () => {
  const today = "2026-03-02";
  expect(isOverdue({ dueDate: "2026-03-01", status: "todo" }, today)).toBe(
    true
  );
  expect(isOverdue({ dueDate: "2026-03-02", status: "todo" }, today)).toBe(
    false
  );
  expect(isOverdue({ dueDate: "2026-03-01", status: "done" }, today)).toBe(
    false
  );
  expect(isOverdue({ dueDate: null, status: "review" }, today)).toBe(false);
});

it("groups My Tasks with the same overdue rule", () => {
  const groups = groupTasksByDueDate(
    [
      { dueDate: "2026-03-01", id: "late", status: "progress" },
      { dueDate: "2026-03-02", id: "today", status: "todo" },
      { dueDate: "2026-03-01", id: "finished", status: "done" },
    ],
    "2026-03-02"
  );
  expect(
    groups.map(({ id, tasks }) => [id, tasks.map((task) => task.id)])
  ).toEqual([
    ["overdue", ["late"]],
    ["today", ["today"]],
    ["completed", ["finished"]],
  ]);
});

it("shares one ordered status list with labels, including backlog", () => {
  expect(TASK_STATUS_ORDER).toEqual([
    "backlog",
    "todo",
    "progress",
    "review",
    "done",
  ]);
  expect(TASK_STATUSES.map(({ label }) => label)).toEqual([
    "Backlog",
    "To Do",
    "In Progress",
    "Review",
    "Done",
  ]);
  expect(taskStatusLabel("progress")).toBe("In Progress");
  expect(taskStatusLabel("unknown")).toBe("unknown");
});

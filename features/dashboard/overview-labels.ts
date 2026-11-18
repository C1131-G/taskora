import { TASK_STATUSES } from "@/src/mobile-api/task-statuses";

const taskStatuses = TASK_STATUSES.map(({ id, label }) => [id, label] as const);
const projectStatusLabels = {
  active: "In Progress",
  complete: "Completed",
  hold: "On Hold",
  planning: "Planning",
  risk: "At Risk",
} as const;

const milestoneDateFormatter = new Intl.DateTimeFormat("en", {
  day: "numeric",
  month: "short",
  timeZone: "UTC",
});

export { milestoneDateFormatter, projectStatusLabels, taskStatuses };

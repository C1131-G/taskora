import { TASK_STATUS_LABELS } from "@/src/mobile-api/task-statuses";
import type { ConditionField } from "@/src/server/automation/automation-model";

export const STATUS_LABELS: Readonly<Record<string, string>> =
  TASK_STATUS_LABELS;

export const PRIORITY_LABELS: Readonly<Record<string, string>> = {
  high: "High",
  low: "Low",
  medium: "Medium",
  none: "None",
  urgent: "Urgent",
};

export const TASK_TYPE_LABELS: Readonly<Record<string, string>> = {
  bug: "Bug",
  task: "Task",
};

export const CONDITION_FIELD_LABELS: Readonly<Record<ConditionField, string>> =
  {
    assignee: "Assignee",
    label: "Label",
    priority: "Priority",
    status: "Status",
    taskType: "Task type",
  };

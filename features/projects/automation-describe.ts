import type {
  AutomationOutcome,
  AutomationRuleSummary,
} from "@/src/server/automation/automation-contracts";
import { AUTOMATION_TRIGGER_LABELS } from "@/src/server/automation/automation-model";
import type {
  AutomationAction,
  AutomationCondition,
  ConditionField,
} from "@/src/server/automation/automation-model";

import {
  CONDITION_FIELD_LABELS,
  PRIORITY_LABELS,
  STATUS_LABELS,
  TASK_TYPE_LABELS,
} from "./automation-labels";

export interface Lookups {
  readonly people: ReadonlyMap<string, string>;
  readonly labels: ReadonlyMap<string, string>;
}

const valueLabel = (
  field: ConditionField,
  value: string,
  lookups: Lookups
): string => {
  switch (field) {
    case "status": {
      return STATUS_LABELS[value] ?? value;
    }
    case "priority": {
      return PRIORITY_LABELS[value] ?? value;
    }
    case "taskType": {
      return TASK_TYPE_LABELS[value] ?? value;
    }
    case "assignee": {
      return lookups.people.get(value) ?? "a removed person";
    }
    case "label": {
      return lookups.labels.get(value) ?? "a removed label";
    }
    default: {
      const unhandled: never = field;
      return unhandled;
    }
  }
};

const describeCondition = (
  condition: AutomationCondition,
  lookups: Lookups
): string => {
  const values = condition.values
    .map((value) => valueLabel(condition.field, value, lookups))
    .join(" or ");
  const verb = condition.op === "in" ? "is" : "is not";
  return `${CONDITION_FIELD_LABELS[condition.field]} ${verb} ${values}`;
};

const person = (userId: string, lookups: Lookups): string =>
  lookups.people.get(userId) ?? "a removed person";

const describeAction = (action: AutomationAction, lookups: Lookups): string => {
  switch (action.type) {
    case "set_status": {
      return `Set status to ${STATUS_LABELS[action.status] ?? action.status}`;
    }
    case "set_priority": {
      return `Set priority to ${PRIORITY_LABELS[action.priority] ?? action.priority}`;
    }
    case "assign": {
      return `Assign ${person(action.userId, lookups)}`;
    }
    case "unassign": {
      return `Unassign ${person(action.userId, lookups)}`;
    }
    case "add_label": {
      return `Add label ${lookups.labels.get(action.labelId) ?? "a removed label"}`;
    }
    case "post_comment": {
      return `Post internal comment "${action.body}"`;
    }
    case "notify": {
      return `Notify ${person(action.userId, lookups)}: ${action.message}`;
    }
    default: {
      const unhandled: never = action;
      return unhandled;
    }
  }
};

export const describeRule = (
  rule: Pick<AutomationRuleSummary, "actions" | "conditions" | "trigger">,
  lookups: Lookups
): {
  readonly when: string;
  readonly conditions: readonly string[];
  readonly actions: readonly string[];
} => ({
  actions: rule.actions.map((action) => describeAction(action, lookups)),
  conditions: rule.conditions.map((condition) =>
    describeCondition(condition, lookups)
  ),
  when: AUTOMATION_TRIGGER_LABELS[rule.trigger],
});

export const outcomeBadge = (
  outcome: AutomationOutcome
): { readonly label: string; readonly tone: "gray" | "green" | "red" } => {
  switch (outcome) {
    case "matched": {
      return { label: "Ran", tone: "green" };
    }
    case "failed": {
      return { label: "Failed", tone: "red" };
    }
    case "skipped": {
      return { label: "Skipped", tone: "gray" };
    }
    default: {
      const _exhaustive: never = outcome;
      return _exhaustive;
    }
  }
};

const ACTION_BLOCKED_PREFIX = "action_blocked:";

const REASON_LABELS: Readonly<Record<string, string>> = {
  conditions_not_met: "Conditions were not met",
  loop_protection_depth:
    "Stopped: automations triggered by automations are followed only one step",
  loop_protection_self: "Stopped: a rule does not react to its own change",
  rate_limited:
    "Skipped: this rule already ran on this task several times recently",
  task_archived: "The task is archived",
  task_missing: "The task no longer exists",
};

export const describeReason = (reason: string | null): string => {
  if (!reason) {
    return "";
  }
  if (reason.startsWith(ACTION_BLOCKED_PREFIX)) {
    const action = reason.slice(ACTION_BLOCKED_PREFIX.length);
    return `This task cannot take the ${action.replaceAll("_", " ")} action`;
  }
  return REASON_LABELS[reason] ?? reason;
};

import { randomUUID } from "node:crypto";

import { Schema } from "effect";

import type { db } from "@/src/prisma/db";

import { AppError } from "../core/action-result";
import {
  AutomationRuleInputSchema,
  StoredRuleBodySchema,
} from "./automation-contracts";
import type {
  AutomationRuleInput,
  AutomationRuleSummary,
} from "./automation-contracts";
import { AUTOMATION_TRIGGERS } from "./automation-model";

type Transaction = Parameters<Parameters<typeof db.transaction>[0]>[0];

export const MAX_RUN_PAGE = 100;

export const invalid = (message: string, field?: string): AppError =>
  new AppError({
    code: "VALIDATION_FAILED",
    message,
    ...(field ? { field } : {}),
  });

const notFound = (): AppError =>
  new AppError({
    code: "NOT_FOUND",
    message: "That automation was not found.",
  });

export const decodeInput = (input: unknown): AutomationRuleInput => {
  try {
    return Schema.decodeUnknownSync(AutomationRuleInputSchema)(input);
  } catch {
    throw invalid("Check the automation and try again.");
  }
};

interface References {
  readonly activeStaff: ReadonlySet<string>;
  readonly anyStaff: ReadonlySet<string>;
  readonly labels: ReadonlySet<string>;
}

export const loadReferences = async (
  transaction: Transaction,
  input: AutomationRuleInput
): Promise<References> => {
  const userIds = new Set<string>();
  const labelIds = new Set<string>();
  for (const action of input.actions) {
    if (
      action.type === "assign" ||
      action.type === "unassign" ||
      action.type === "notify"
    ) {
      userIds.add(action.userId);
    }
    if (action.type === "add_label") {
      labelIds.add(action.labelId);
    }
  }
  for (const condition of input.conditions) {
    const target = condition.field === "assignee" ? userIds : labelIds;
    if (condition.field === "assignee" || condition.field === "label") {
      for (const value of condition.values) {
        target.add(value);
      }
    }
  }
  const [users, labels] = await Promise.all([
    transaction.orm.public.User.where((user) => user.id.in([...userIds]))
      .select("id", "role", "deactivatedAt")
      .all(),
    transaction.orm.public.Label.where((label) => label.id.in([...labelIds]))
      .select("id")
      .all(),
  ]);
  const activeStaff = new Set<string>();
  const anyStaff = new Set<string>();
  for (const { deactivatedAt, id, role } of users) {
    if (role !== "client") {
      anyStaff.add(id);
      if (!deactivatedAt) {
        activeStaff.add(id);
      }
    }
  }
  return {
    activeStaff,
    anyStaff,
    labels: new Set(labels.map(({ id }) => id)),
  };
};

// People and labels must exist now; the runner checks again when it runs.
export const assertReferences = (
  input: AutomationRuleInput,
  references: References
): void => {
  for (const action of input.actions) {
    switch (action.type) {
      case "assign":
      case "notify": {
        if (!references.activeStaff.has(action.userId)) {
          throw invalid("Choose an active team member.", "actions");
        }
        break;
      }
      case "unassign": {
        if (!references.anyStaff.has(action.userId)) {
          throw invalid("Choose a team member.", "actions");
        }
        break;
      }
      case "add_label": {
        if (!references.labels.has(action.labelId)) {
          throw invalid("Choose an existing label.", "actions");
        }
        break;
      }
      // Statuses, priorities and comment text reference nothing that can go missing.
      case "set_status":
      case "set_priority":
      case "post_comment": {
        break;
      }
      default: {
        const _exhaustive: never = action;
        return _exhaustive;
      }
    }
  }
  for (const condition of input.conditions) {
    const known =
      condition.field === "assignee" ? references.anyStaff : references.labels;
    const checked =
      condition.field === "assignee" || condition.field === "label";
    if (checked && !condition.values.every((value) => known.has(value))) {
      throw invalid(
        condition.field === "assignee"
          ? "Choose team members for the assignee condition."
          : "Choose existing labels for the label condition.",
        "conditions"
      );
    }
  }
};

interface RuleRow {
  readonly id: string;
  readonly projectId: string;
  readonly name: string;
  readonly trigger: string;
  readonly conditions: unknown;
  readonly actions: unknown;
  readonly enabled: boolean;
  readonly version: number;
  readonly createdAt: Date;
  readonly updatedAt: Date;
}

const triggerOf = (value: string) => {
  const trigger = AUTOMATION_TRIGGERS.find((candidate) => candidate === value);
  if (!trigger) {
    throw new AppError({
      code: "UNAVAILABLE",
      message: "An automation has an unknown trigger.",
    });
  }
  return trigger;
};

export const toSummary = (row: RuleRow): AutomationRuleSummary => {
  const body = Schema.decodeUnknownSync(StoredRuleBodySchema)({
    actions: row.actions,
    conditions: row.conditions,
  });
  return {
    actions: body.actions,
    conditions: body.conditions,
    createdAt: row.createdAt.toISOString(),
    enabled: row.enabled,
    id: row.id,
    name: row.name.trim(),
    projectId: row.projectId,
    trigger: triggerOf(row.trigger),
    updatedAt: row.updatedAt.toISOString(),
    version: row.version,
  };
};

export const recordActivity = (
  transaction: Transaction,
  actorId: string,
  action: string,
  rule: { readonly id: string; readonly projectId: string }
) =>
  transaction.orm.public.Activity.create({
    action: `automation_rule.${action}`,
    actorId,
    createdAt: new Date(),
    details: { ruleId: rule.id },
    id: randomUUID(),
    projectId: rule.projectId,
    taskId: null,
  });

export const requireRule = async (transaction: Transaction, ruleId: string) => {
  const rule = await transaction.orm.public.AutomationRule.where({
    id: ruleId,
  }).first();
  if (!rule) {
    throw notFound();
  }
  return rule;
};

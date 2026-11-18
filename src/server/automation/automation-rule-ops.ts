import { randomUUID } from "node:crypto";

import { db } from "@/src/prisma/db";

import { AppError } from "../core/action-result";
import { requireAdmin } from "../webhooks/webhook-internal";
import {
  MAX_RULES_PER_PROJECT,
  AUTOMATION_OUTCOMES,
} from "./automation-contracts";
import type {
  AutomationOutcome,
  AutomationRuleInput,
  AutomationRuleSummary,
  AutomationRunSummary,
} from "./automation-contracts";
import {
  MAX_RUN_PAGE,
  assertReferences,
  decodeInput,
  invalid,
  loadReferences,
  recordActivity,
  requireRule,
  toSummary,
} from "./automation-rule-support";

export const listRules = async (
  actorId: string,
  projectId: string
): Promise<readonly AutomationRuleSummary[]> => {
  await requireAdmin(actorId);
  const rows = await db.orm.public.AutomationRule.where({ projectId })
    .orderBy((rule) => rule.createdAt.asc())
    .all();
  return rows.map(toSummary);
};

export const createRule = async (
  actorId: string,
  projectId: string,
  rawInput: AutomationRuleInput
): Promise<AutomationRuleSummary> => {
  await requireAdmin(actorId);
  const input = decodeInput(rawInput);
  return db.transaction(async (transaction) => {
    const project = await transaction.orm.public.Project.where({
      id: projectId,
    })
      .select("id", "archivedAt")
      .first();
    if (!project) {
      throw new AppError({
        code: "NOT_FOUND",
        message: "The project was not found.",
      });
    }
    if (project.archivedAt) {
      throw new AppError({
        code: "FORBIDDEN",
        message: "Archived projects are read only.",
      });
    }
    // Writing the project's counter row takes its row lock until commit, so
    // concurrent creates count one after another and cannot pass the limit.
    await transaction.orm.public.ProjectTaskCounter.upsert({
      conflictOn: { projectId },
      create: { nextNumber: 1, projectId, updatedAt: new Date() },
      update: { updatedAt: new Date() },
    });
    const existing = await transaction.orm.public.AutomationRule.where({
      projectId,
    })
      .select("id")
      .all();
    if (existing.length >= MAX_RULES_PER_PROJECT) {
      throw invalid(
        `A project can have at most ${MAX_RULES_PER_PROJECT} automations.`
      );
    }
    assertReferences(input, await loadReferences(transaction, input));
    const now = new Date();
    const created = await transaction.orm.public.AutomationRule.create({
      actions: [...input.actions],
      conditions: [...input.conditions],
      createdAt: now,
      createdById: actorId,
      enabled: true,
      id: randomUUID(),
      name: input.name.trim(),
      projectId,
      trigger: input.trigger,
      updatedAt: now,
      version: 1,
    });
    await recordActivity(transaction, actorId, "created", created);
    return toSummary(created);
  });
};

export const updateRule = async (
  actorId: string,
  ruleId: string,
  expectedVersion: number,
  rawInput: AutomationRuleInput
): Promise<AutomationRuleSummary> => {
  await requireAdmin(actorId);
  const input = decodeInput(rawInput);
  return db.transaction(async (transaction) => {
    const current = await requireRule(transaction, ruleId);
    assertReferences(input, await loadReferences(transaction, input));
    const updated = await transaction.orm.public.AutomationRule.where({
      id: ruleId,
      version: expectedVersion,
    }).updateAndCount({
      actions: [...input.actions],
      conditions: [...input.conditions],
      name: input.name.trim(),
      trigger: input.trigger,
      updatedAt: new Date(),
      version: expectedVersion + 1,
    });
    if (!updated) {
      throw new AppError({
        code: "CONFLICT",
        message: "The automation changed. Refresh and try again.",
      });
    }
    await recordActivity(transaction, actorId, "updated", current);
    return toSummary(await requireRule(transaction, ruleId));
  });
};

export const setRuleEnabled = async (
  actorId: string,
  ruleId: string,
  enabled: boolean
): Promise<AutomationRuleSummary> => {
  await requireAdmin(actorId);
  return db.transaction(async (transaction) => {
    const current = await requireRule(transaction, ruleId);
    await transaction.orm.public.AutomationRule.where({ id: ruleId }).update({
      enabled,
      updatedAt: new Date(),
      version: current.version + 1,
    });
    await recordActivity(
      transaction,
      actorId,
      enabled ? "enabled" : "disabled",
      current
    );
    return toSummary(await requireRule(transaction, ruleId));
  });
};

export const removeRule = async (
  actorId: string,
  ruleId: string
): Promise<void> => {
  await requireAdmin(actorId);
  await db.transaction(async (transaction) => {
    const current = await requireRule(transaction, ruleId);
    await transaction.orm.public.AutomationRule.where({
      id: ruleId,
    }).deleteAll();
    await recordActivity(transaction, actorId, "removed", current);
  });
};

const outcomeOf = (value: string): AutomationOutcome =>
  AUTOMATION_OUTCOMES.find((outcome) => outcome === value) ?? "failed";

export const listRuns = async (
  actorId: string,
  projectId: string,
  requestedLimit: number
): Promise<readonly AutomationRunSummary[]> => {
  await requireAdmin(actorId);
  const limit = Math.min(
    MAX_RUN_PAGE,
    Math.max(
      1,
      Number.isFinite(requestedLimit) ? Math.trunc(requestedLimit) : 1
    )
  );
  const runs = await db.orm.public.AutomationRun.where({ projectId })
    .orderBy((run) => run.createdAt.desc())
    .limit(limit)
    .all();
  if (runs.length === 0) {
    return [];
  }
  const ruleIds = [...new Set(runs.map(({ ruleId }) => ruleId))];
  const taskIds = [
    ...new Set(runs.flatMap(({ taskId }) => (taskId === null ? [] : [taskId]))),
  ];
  const [rules, tasks, project] = await Promise.all([
    db.orm.public.AutomationRule.where((rule) => rule.id.in(ruleIds))
      .select("id", "name")
      .all(),
    db.orm.public.Task.where((task) => task.id.in(taskIds))
      .select("id", "projectTaskNumber")
      .all(),
    db.orm.public.Project.where({ id: projectId }).select("key").first(),
  ]);
  const ruleNames = new Map(rules.map(({ id, name }) => [id, name]));
  const taskNumbers = new Map(
    tasks.map(({ id, projectTaskNumber }) => [id, projectTaskNumber])
  );
  return runs.map((run) => {
    const number =
      run.taskId === null ? undefined : taskNumbers.get(run.taskId);
    return {
      createdAt: run.createdAt.toISOString(),
      depth: run.depth,
      id: run.id,
      outcome: outcomeOf(run.outcome),
      reason: run.reason,
      ruleId: run.ruleId,
      ruleName: ruleNames.get(run.ruleId) ?? "Removed automation",
      taskId: run.taskId,
      taskKey:
        project && number !== undefined ? `${project.key}-${number}` : null,
      trigger: run.trigger,
    };
  });
};

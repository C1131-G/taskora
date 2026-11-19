import { randomUUID } from "node:crypto";

import { db } from "@/src/prisma/db";

import { isUniqueConstraintViolation } from "../core/prisma-errors";
import { activeAdminIds, notifyUsers } from "../notifications/notify-users";
import type { ProjectBudgetView } from "./budget-support";
import {
  MINUTES_PER_HOUR,
  companyTimeZone,
  requireProject,
  toView,
} from "./budget-support";

const formatHours = (minutes: number): string => {
  const hours = Math.round((minutes / MINUTES_PER_HOUR) * 10) / 10;
  return `${hours}h`;
};

interface AlertCopy {
  readonly snippet: string;
  readonly text: string;
}

const alertCopy = (
  projectName: string,
  level: "overrun" | "warning",
  view: ProjectBudgetView
): AlertCopy => ({
  snippet: `${formatHours(view.spentMinutes)} of ${formatHours(view.budgetMinutes)} used${
    view.kind === "retainer" ? ` in ${view.period.key}` : ""
  }`,
  text:
    level === "overrun"
      ? `Budget exceeded: ${projectName} is over its hours budget`
      : `Budget warning: ${projectName} has used ${view.percent}% of its hours`,
});

// Records each newly reached level once per period and notifies the
// administrators and the project lead. The (project, period, level) row is the
// dedupe key: a repeat evaluation, or a racing one, finds it and stays quiet.
export const evaluateBudgetAlerts = async (
  projectId: string,
  now: Date
): Promise<void> => {
  const budget = await db.orm.public.ProjectBudget.where({
    projectId,
  }).first();
  if (!budget) {
    return;
  }
  const view = await toView(budget, now, await companyTimeZone(), false);
  const reached: ("overrun" | "warning")[] = [];
  if (view.level !== "ok") {
    reached.push("warning");
  }
  if (view.level === "overrun") {
    reached.push("overrun");
  }
  if (reached.length === 0) {
    return;
  }
  const recorded = await db.orm.public.ProjectBudgetAlert.where({
    periodKey: view.period.key,
    projectId,
  })
    .select("level")
    .all();
  const known = new Set(recorded.map(({ level }) => level));
  const fresh = reached.filter((level) => !known.has(level));
  const loudest = fresh.at(-1);
  if (!loudest) {
    return;
  }
  const project = await requireProject(projectId);
  const copy = alertCopy(project.name, loudest, view);
  try {
    await db.transaction(async (transaction) => {
      await Promise.all(
        fresh.map((level) =>
          transaction.orm.public.ProjectBudgetAlert.create({
            createdAt: now,
            level,
            periodKey: view.period.key,
            projectId,
          })
        )
      );
      const admins = await activeAdminIds(transaction);
      await notifyUsers(transaction, {
        actorId: null,
        now,
        projectId,
        recipientIds: project.leadId ? [...admins, project.leadId] : admins,
        snippet: copy.snippet,
        taskId: null,
        text: copy.text,
        type: "status",
        url: `/projects/${projectId}/time`,
      });
    });
  } catch (error) {
    // A concurrent evaluation claimed the level first and announced it.
    if (!isUniqueConstraintViolation(error)) {
      throw error;
    }
  }
};

export const BUDGET_EVALUATION_JOB = "budget.evaluate";
const MINUTE_MS = 60_000;

// Logging time asks for a budget check without waiting for it: the check runs
// as a queued job, so a slow or failing alert never delays saving the time.
// Checks queued within the same minute for one project share a job.
export const enqueueBudgetEvaluation = async (
  projectId: string,
  now: Date
): Promise<void> => {
  const dedupeKey = `${BUDGET_EVALUATION_JOB}:${projectId}:${Math.floor(now.getTime() / MINUTE_MS)}`;
  await db.orm.public.Job.upsert({
    conflictOn: { dedupeKey },
    create: {
      availableAt: now,
      createdAt: now,
      dedupeKey,
      id: randomUUID(),
      kind: BUDGET_EVALUATION_JOB,
      payload: { projectId },
      updatedAt: now,
    },
    update: { updatedAt: now },
  });
};

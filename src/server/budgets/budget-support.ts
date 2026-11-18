import { and } from "@prisma/orm-postgres/orm-client";
import { Schema } from "effect";

import { db } from "@/src/prisma/db";

import { AppError } from "../core/action-result";
import { UUIDSchema } from "../core/input-schemas";
import { budgetPeriod, burnOf } from "./budget-math";
import type { BudgetKind, BudgetPeriod, BurnLevel } from "./budget-math";

const DEFAULT_TIME_ZONE = "UTC";
export const MINUTES_PER_HOUR = 60;
const MAX_BUDGET_MINUTES = 6_000_000;
const MAX_WARNING_PERCENT = 100;
const CURRENCY_CODE = /^[A-Z]{3}$/u;

const isUuid = Schema.is(UUIDSchema);

export interface BudgetInput {
  readonly billableOnly: boolean;
  readonly budgetMinutes: number;
  readonly currency: string;
  readonly hourlyRateCents: number | null;
  readonly kind: BudgetKind;
  readonly warningPercent: number;
}

export interface ProjectBudgetView {
  readonly billableOnly: boolean;
  readonly budgetAmountCents: number | null;
  readonly budgetMinutes: number;
  readonly currency: string;
  readonly hourlyRateCents: number | null;
  readonly kind: BudgetKind;
  readonly level: BurnLevel;
  readonly percent: number;
  readonly period: BudgetPeriod;
  readonly projectId: string;
  readonly remainingMinutes: number;
  readonly spentAmountCents: number | null;
  readonly spentMinutes: number;
  readonly warningPercent: number;
}

export interface BudgetListRow extends ProjectBudgetView {
  readonly projectKey: string;
  readonly projectName: string;
}

export const unavailable = (error: unknown): AppError =>
  error instanceof AppError
    ? error
    : new AppError({
        code: "UNAVAILABLE",
        message: "Budgets could not be loaded or saved.",
      });

const invalid = (field: string, message: string): AppError =>
  new AppError({ code: "VALIDATION_FAILED", field, message });

const notFound = (): AppError =>
  new AppError({ code: "NOT_FOUND", message: "The project was not found." });

interface Actor {
  readonly id: string;
  readonly isAdmin: boolean;
}

// Same gate as the time pages. Clients never reach budgets.
export const requireWorkspaceUser = async (actorId: string): Promise<Actor> => {
  const actor = await db.orm.public.User.where({ id: actorId })
    .select("deactivatedAt", "mustChangePassword", "role")
    .first();
  if (!actor || actor.deactivatedAt || actor.role === "client") {
    throw new AppError({
      code: "UNAUTHENTICATED",
      message: "Sign in to continue.",
    });
  }
  if (actor.mustChangePassword) {
    throw new AppError({
      code: "FORBIDDEN",
      message: "Change your password before continuing.",
    });
  }
  return { id: actorId, isAdmin: actor.role === "admin" };
};

export const requireAdmin = async (actorId: string): Promise<void> => {
  const actor = await requireWorkspaceUser(actorId);
  if (!actor.isAdmin) {
    throw new AppError({
      code: "FORBIDDEN",
      message: "Only administrators can manage budgets.",
    });
  }
};

export const validateInput = (input: BudgetInput): void => {
  if (
    !Number.isInteger(input.budgetMinutes) ||
    input.budgetMinutes < 1 ||
    input.budgetMinutes > MAX_BUDGET_MINUTES
  ) {
    throw invalid("budgetMinutes", "Enter a budget of at least one minute.");
  }
  if (
    !Number.isInteger(input.warningPercent) ||
    input.warningPercent < 1 ||
    input.warningPercent > MAX_WARNING_PERCENT
  ) {
    throw invalid("warningPercent", "Enter a warning between 1 and 100%.");
  }
  if (
    input.hourlyRateCents !== null &&
    (!Number.isInteger(input.hourlyRateCents) || input.hourlyRateCents < 0)
  ) {
    throw invalid("hourlyRateCents", "Enter a rate of zero or more.");
  }
  if (!CURRENCY_CODE.test(input.currency)) {
    throw invalid("currency", "Use a three-letter currency code such as USD.");
  }
};

export const companyTimeZone = async (): Promise<string> => {
  const settings = await db.orm.public.CompanySettings.where({ id: "company" })
    .select("timeZone")
    .first();
  return settings?.timeZone ?? DEFAULT_TIME_ZONE;
};

export const requireProject = async (projectId: string) => {
  const project = isUuid(projectId)
    ? await db.orm.public.Project.where({ id: projectId })
        .select("id", "key", "leadId", "name")
        .first()
    : null;
  if (!project) {
    throw notFound();
  }
  return project;
};

// Minutes logged on the project's tasks inside the period.
const spentMinutesIn = async (
  projectId: string,
  period: BudgetPeriod,
  billableOnly: boolean
): Promise<number> => {
  const tasks = await db.orm.public.Task.where({ projectId })
    .select("id")
    .all();
  if (tasks.length === 0) {
    return 0;
  }
  const totals = await db.orm.public.TimeEntry.where((entry) =>
    and(
      entry.taskId.in(tasks.map(({ id }) => id)),
      ...(period.from === null ? [] : [entry.workDate.gte(period.from)]),
      ...(period.to === null ? [] : [entry.workDate.lte(period.to)]),
      ...(billableOnly ? [entry.billable.eq(true)] : [])
    )
  ).aggregate((aggregates) => ({ total: aggregates.sum("minutes") }));
  return totals.total ?? 0;
};

interface BudgetRow {
  readonly billableOnly: boolean;
  readonly budgetMinutes: number;
  readonly currency: string;
  readonly hourlyRateCents: number | null;
  readonly kind: BudgetKind;
  readonly projectId: string;
  readonly warningPercent: number;
}

export const toView = async (
  row: BudgetRow,
  now: Date,
  timeZone: string,
  includeMoney: boolean
): Promise<ProjectBudgetView> => {
  const period = budgetPeriod(row.kind, now, timeZone);
  const spentMinutes = await spentMinutesIn(
    row.projectId,
    period,
    row.billableOnly
  );
  const burn = burnOf({
    budgetMinutes: row.budgetMinutes,
    spentMinutes,
    warningPercent: row.warningPercent,
  });
  const rate = includeMoney ? row.hourlyRateCents : null;
  const amountOf = (minutes: number): number | null =>
    rate === null ? null : Math.round((minutes * rate) / MINUTES_PER_HOUR);
  return {
    billableOnly: row.billableOnly,
    budgetAmountCents: amountOf(row.budgetMinutes),
    budgetMinutes: row.budgetMinutes,
    currency: row.currency,
    hourlyRateCents: rate,
    kind: row.kind,
    level: burn.level,
    percent: burn.percent,
    period,
    projectId: row.projectId,
    remainingMinutes: burn.remainingMinutes,
    spentAmountCents: amountOf(spentMinutes),
    spentMinutes,
    warningPercent: row.warningPercent,
  };
};

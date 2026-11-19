import { and } from "@prisma/orm-postgres/orm-client";
import { Context, Effect, Layer } from "effect";

import { db } from "@/src/prisma/db";

import { AppError } from "../core/action-result";
import { evaluateBudgetAlerts } from "./budget-alerts";
import type {
  BudgetInput,
  BudgetListRow,
  ProjectBudgetView,
} from "./budget-support";
import {
  companyTimeZone,
  requireAdmin,
  requireProject,
  requireWorkspaceUser,
  toView,
  unavailable,
  validateInput,
} from "./budget-support";

const get = (actorId: string, projectId: string, now: Date) =>
  Effect.tryPromise({
    catch: unavailable,
    try: async (): Promise<ProjectBudgetView | null> => {
      const actor = await requireWorkspaceUser(actorId);
      const project = await requireProject(projectId);
      if (!actor.isAdmin && project.leadId !== actorId) {
        const membership = await db.orm.public.ProjectMember.where({
          projectId,
          userId: actorId,
        }).first();
        if (!membership) {
          throw new AppError({
            code: "FORBIDDEN",
            message:
              "Only administrators and members of this project can see its budget.",
          });
        }
      }
      const row = await db.orm.public.ProjectBudget.where({
        projectId,
      }).first();
      return row
        ? await toView(row, now, await companyTimeZone(), actor.isAdmin)
        : null;
    },
  });

const list = (actorId: string, now: Date) =>
  Effect.tryPromise({
    catch: unavailable,
    try: async (): Promise<readonly BudgetListRow[]> => {
      await requireAdmin(actorId);
      const budgets = await db.orm.public.ProjectBudget.all();
      if (budgets.length === 0) {
        return [];
      }
      const [projects, timeZone] = await Promise.all([
        db.orm.public.Project.where((project) =>
          and(
            project.id.in(budgets.map(({ projectId }) => projectId)),
            project.archivedAt.isNull()
          )
        )
          .select("id", "key", "name")
          .all(),
        companyTimeZone(),
      ]);
      const rows = await Promise.all(
        projects.map(async (project) => {
          const budget = budgets.find(
            ({ projectId }) => projectId === project.id
          );
          return budget
            ? [
                {
                  ...(await toView(budget, now, timeZone, true)),
                  projectKey: project.key,
                  projectName: project.name,
                },
              ]
            : [];
        })
      );
      return rows
        .flat()
        .toSorted(
          (left, right) =>
            right.percent - left.percent ||
            left.projectName.localeCompare(right.projectName)
        );
    },
  });

const save = (
  actorId: string,
  projectId: string,
  input: BudgetInput,
  now: Date
) =>
  Effect.tryPromise({
    catch: unavailable,
    try: async (): Promise<ProjectBudgetView> => {
      await requireAdmin(actorId);
      validateInput(input);
      await requireProject(projectId);
      const before = await db.orm.public.ProjectBudget.where({
        projectId,
      }).first();
      const row = await db.orm.public.ProjectBudget.upsert({
        conflictOn: { projectId },
        create: { ...input, createdAt: now, projectId, updatedAt: now },
        update: { ...input, updatedAt: now },
      });
      // Changing the hours or the warning level starts the alerts over, so the
      // new limits warn again even in a period that already warned.
      if (
        before &&
        (before.budgetMinutes !== row.budgetMinutes ||
          before.warningPercent !== row.warningPercent)
      ) {
        await db.orm.public.ProjectBudgetAlert.where({ projectId }).delete();
      }
      await evaluateBudgetAlerts(projectId, now);
      return await toView(row, now, await companyTimeZone(), true);
    },
  });

const clear = (actorId: string, projectId: string) =>
  Effect.tryPromise({
    catch: unavailable,
    try: async (): Promise<void> => {
      await requireAdmin(actorId);
      await requireProject(projectId);
      await db.orm.public.ProjectBudget.where({ projectId }).delete();
    },
  });

export class ProjectBudgets extends Context.Service<
  ProjectBudgets,
  {
    readonly get: (
      actorId: string,
      projectId: string,
      now: Date
    ) => Effect.Effect<ProjectBudgetView | null, AppError>;
    readonly list: (
      actorId: string,
      now: Date
    ) => Effect.Effect<readonly BudgetListRow[], AppError>;
    readonly save: (
      actorId: string,
      projectId: string,
      input: BudgetInput,
      now: Date
    ) => Effect.Effect<ProjectBudgetView, AppError>;
    readonly clear: (
      actorId: string,
      projectId: string
    ) => Effect.Effect<void, AppError>;
  }
>()("taskora/server/ProjectBudgets") {}

export const ProjectBudgetsLive = Layer.succeed(ProjectBudgets, {
  clear,
  get,
  list,
  save,
});

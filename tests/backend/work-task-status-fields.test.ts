import { expect, it } from "bun:test";
import { randomUUID } from "node:crypto";

import { Effect } from "effect";

import { db } from "../../src/prisma/db";
import { authPool } from "../../src/server/auth/database";
import { runEffectResult } from "../../src/server/core/action-result";
import { TaskCsv, TaskCsvLive } from "../../src/server/tasks/task-csv";
import { taskStatusFields } from "../../src/server/work/work-internal";
import {
  WorkManagement,
  WorkManagementLive,
} from "../../src/server/work/work-management";
import { createTaskInTransaction } from "../../src/server/work/work-task-creation";

process.env["BETTER_AUTH_SECRET"] ??=
  "test-only-secret-that-is-at-least-thirty-two-characters";

const work = <Value>(
  program: (service: WorkManagement["Service"]) => Effect.Effect<Value, unknown>
) =>
  Effect.provide(
    Effect.gen(function* run() {
      return yield* program(yield* WorkManagement);
    }),
    WorkManagementLive
  );

const withProject = async (
  run: (ids: {
    readonly actorId: string;
    readonly projectId: string;
  }) => Promise<void>
) => {
  const actorId = randomUUID();
  const projectId = randomUUID();
  await authPool.query(
    'INSERT INTO "user" (id, name, email, "emailNormalized", role, "mustChangePassword") VALUES ($1, $2, $3, $3, \'admin\', false)',
    [actorId, "Status Fields Admin", `${actorId}@status-fields.example`]
  );
  await authPool.query(
    "INSERT INTO project (id, key, name) VALUES ($1, $2, $3)",
    [projectId, `F${randomUUID().slice(0, 5)}`, "Status fields project"]
  );
  try {
    await run({ actorId, projectId });
  } finally {
    await authPool.query('DELETE FROM activity WHERE "actorId" = $1', [
      actorId,
    ]);
    await authPool.query('DELETE FROM undo_record WHERE "actorId" = $1', [
      actorId,
    ]);
    await authPool.query(
      'DELETE FROM recurrence_generation WHERE "sourceTaskId" IN (SELECT id FROM task WHERE "projectId" = $1) OR "successorTaskId" IN (SELECT id FROM task WHERE "projectId" = $1)',
      [projectId]
    );
    await authPool.query('DELETE FROM task WHERE "projectId" = $1', [
      projectId,
    ]);
    await authPool.query("DELETE FROM project WHERE id = $1", [projectId]);
    await authPool.query('DELETE FROM "user" WHERE id = $1', [actorId]);
  }
};

it("ties completedAt to the done status and keeps the first completion time", () => {
  const first = new Date("2026-01-01T00:00:00Z");
  const now = new Date("2026-02-01T00:00:00Z");
  expect(taskStatusFields("done", null, now)).toEqual({
    completedAt: now,
    status: "done",
  });
  expect(taskStatusFields("done", first, now).completedAt).toBe(first);
  expect(taskStatusFields("review", first, now)).toEqual({
    completedAt: null,
    status: "review",
  });
});

it("creates an imported done task with its completion time in one write", async () => {
  await withProject(async ({ actorId, projectId }) => {
    const result = await Effect.runPromise(
      Effect.provide(
        Effect.gen(function* importTasks() {
          const csv = yield* TaskCsv;
          return yield* csv.importTasks(
            actorId,
            projectId,
            "title,status\nShipped,done\nStill open,review\n"
          );
        }),
        TaskCsvLive
      )
    );
    expect(result).toEqual({ created: 2, errors: [] });
    const rows = await authPool.query<{
      completed: boolean;
      status: string;
      title: string;
    }>(
      'SELECT title, status, "completedAt" IS NOT NULL AS completed FROM task WHERE "projectId" = $1 ORDER BY "projectTaskNumber"',
      [projectId]
    );
    expect(rows.rows).toEqual([
      { completed: true, status: "done", title: "Shipped" },
      { completed: false, status: "review", title: "Still open" },
    ]);

    const created = await db.transaction((transaction) =>
      createTaskInTransaction(
        transaction,
        actorId,
        {
          assigneeIds: [],
          description: null,
          dueDate: null,
          priority: "none",
          projectId,
          title: "Starts in backlog",
        },
        "task",
        "backlog"
      )
    );
    expect(created.status).toBe("backlog");
  });
});

it("moves a recurring task's next run with a bulk due date change, and leaves it on conflict", async () => {
  await withProject(async ({ actorId, projectId }) => {
    const task = await Effect.runPromise(
      work((service) =>
        service.createTask(actorId, {
          assigneeIds: [],
          description: null,
          dueDate: "2026-03-01",
          priority: "none",
          projectId,
          title: "Monthly report",
        })
      )
    );
    const recurring = await Effect.runPromise(
      work((service) =>
        service.setTaskRecurrence(actorId, task.id, task.version, {
          endsOn: null,
          frequency: "monthly",
          interval: 1,
          weekDays: [],
        })
      )
    );
    const nextRunAt = async () => {
      const rows = await authPool.query<{ nextRunAt: string | null }>(
        'SELECT "nextRunAt"::text AS "nextRunAt" FROM task_recurrence WHERE "taskId" = $1',
        [task.id]
      );
      return rows.rows[0]?.nextRunAt;
    };
    const bulk = (expectedVersion: number, dueDate: string) =>
      work((service) =>
        service.bulkUpdateTasks(
          actorId,
          [{ expectedVersion, taskId: task.id }],
          { assigneeIds: [], dueDate, priority: "none", status: "progress" }
        )
      );

    expect(await nextRunAt()).toBe("2026-03-01");
    const stale = await runEffectResult(bulk(task.version, "2026-04-01"));
    expect(stale).toMatchObject({ error: { code: "CONFLICT" }, ok: false });
    expect(await nextRunAt()).toBe("2026-03-01");

    await Effect.runPromise(bulk(recurring.version, "2026-04-15"));
    expect(await nextRunAt()).toBe("2026-04-15");
  });
});

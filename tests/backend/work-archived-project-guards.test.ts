import { expect, it } from "bun:test";
import { randomUUID } from "node:crypto";

import { Effect } from "effect";

import { authPool } from "../../src/server/auth/database";
import {
  CalendarFeed,
  CalendarFeedLive,
} from "../../src/server/calendar/calendar-feed";
import { runEffectResult } from "../../src/server/core/action-result";
import {
  WorkManagement,
  WorkManagementLive,
} from "../../src/server/work/work-management";
import { listMyWork } from "../../src/server/work/work-my-tasks";
import { listTaskPage } from "../../src/server/work/work-task-list";

process.env["BETTER_AUTH_SECRET"] ??=
  "test-only-secret-that-is-at-least-thirty-two-characters";

// Archiving a project leaves its tasks untouched, so every reader and writer
// must also treat a task of an archived project as archived work.

const work = <Value>(
  program: (service: WorkManagement["Service"]) => Effect.Effect<Value, unknown>
) =>
  Effect.provide(
    Effect.gen(function* run() {
      return yield* program(yield* WorkManagement);
    }),
    WorkManagementLive
  );

const feed = <Value>(
  program: (service: CalendarFeed["Service"]) => Effect.Effect<Value, unknown>
) =>
  Effect.runPromise(
    Effect.provide(
      Effect.gen(function* run() {
        return yield* program(yield* CalendarFeed);
      }),
      CalendarFeedLive
    )
  );

const setProjectArchived = async (
  projectId: string,
  adminId: string,
  archived: boolean
) => {
  await authPool.query(
    'UPDATE project SET "archivedAt" = $2, "archivedById" = $3 WHERE id = $1',
    [projectId, archived ? new Date() : null, archived ? adminId : null]
  );
};

const taskRow = async (taskId: string) => {
  const rows = await authPool.query<{
    archivedAt: Date | null;
    completedAt: Date | null;
    status: string;
  }>('SELECT status, "completedAt", "archivedAt" FROM task WHERE id = $1', [
    taskId,
  ]);
  return rows.rows[0];
};

const withProject = async (
  run: (ids: {
    readonly adminId: string;
    readonly employeeId: string;
    readonly projectId: string;
  }) => Promise<void>
) => {
  const adminId = randomUUID();
  const employeeId = randomUUID();
  const projectId = randomUUID();
  for (const [id, name, role] of [
    [adminId, "Archive Admin", "admin"],
    [employeeId, "Archive Employee", "employee"],
  ] as const) {
    // oxlint-disable-next-line no-await-in-loop -- Two setup rows.
    await authPool.query(
      'INSERT INTO "user" (id, name, email, "emailNormalized", role, "mustChangePassword") VALUES ($1, $2, $3, $3, $4, false)',
      [id, name, `${id}@archived-guards.example`, role]
    );
  }
  await authPool.query(
    "INSERT INTO project (id, key, name) VALUES ($1, $2, $3)",
    [projectId, `A${randomUUID().slice(0, 5)}`, "Archived guards project"]
  );
  const startedAt = new Date();
  try {
    await run({ adminId, employeeId, projectId });
  } finally {
    const users = [adminId, employeeId];
    // Task changes queue webhook and automation jobs.
    await authPool.query('DELETE FROM job WHERE "createdAt" >= $1', [
      startedAt,
    ]);
    await authPool.query(
      'DELETE FROM calendar_feed_token WHERE "userId" = ANY($1)',
      [users]
    );
    await authPool.query('DELETE FROM activity WHERE "actorId" = ANY($1)', [
      users,
    ]);
    await authPool.query('DELETE FROM undo_record WHERE "actorId" = ANY($1)', [
      users,
    ]);
    await authPool.query('DELETE FROM notification WHERE "userId" = ANY($1)', [
      users,
    ]);
    await authPool.query('DELETE FROM task WHERE "projectId" = $1', [
      projectId,
    ]);
    await authPool.query("DELETE FROM project WHERE id = $1", [projectId]);
    await authPool.query('DELETE FROM "user" WHERE id = ANY($1)', [users]);
  }
};

const createTask = (
  actorId: string,
  projectId: string,
  title: string,
  assigneeIds: readonly string[] = [],
  dueDate: string | null = null
) =>
  Effect.runPromise(
    work((service) =>
      service.createTask(actorId, {
        assigneeIds: [...assigneeIds],
        description: null,
        dueDate,
        priority: "none",
        projectId,
        title,
      })
    )
  );

it("refuses to undo a completion after the project was archived, and allows it once restored", async () => {
  await withProject(async ({ adminId, projectId }) => {
    const task = await createTask(adminId, projectId, "Complete then archive");
    const completed = await Effect.runPromise(
      work((service) =>
        service.updateTask(adminId, task.id, task.version, {
          assigneeIds: [],
          description: null,
          dueDate: null,
          priority: "none",
          status: "done",
          title: task.title,
        })
      )
    );
    const undoId = completed.completionUndo?.undoId ?? "";
    expect(undoId).not.toBe("");
    const undo = work((service) => service.undoTaskCompletion(adminId, undoId));

    await setProjectArchived(projectId, adminId, true);
    expect(await runEffectResult(undo)).toMatchObject({
      error: { code: "FORBIDDEN" },
      ok: false,
    });
    const stillDone = await taskRow(task.id);
    expect(stillDone?.status).toBe("done");

    await setProjectArchived(projectId, adminId, false);
    expect(await runEffectResult(undo)).toMatchObject({ ok: true });
    const reopened = await taskRow(task.id);
    expect(reopened?.status).toBe("todo");
    expect(reopened?.completedAt).toBeNull();
  });
});

it("refuses to undo a task archive while its project is archived, as restore does", async () => {
  await withProject(async ({ adminId, projectId }) => {
    const task = await createTask(adminId, projectId, "Archive then archive");
    const receipt = await Effect.runPromise(
      work((service) => service.archiveTask(adminId, task.id, task.version))
    );
    const undo = work((service) =>
      service.undoTaskArchive(adminId, receipt.undoId)
    );

    await setProjectArchived(projectId, adminId, true);
    expect(await runEffectResult(undo)).toMatchObject({
      error: { code: "CONFLICT" },
      ok: false,
    });
    const stillArchived = await taskRow(task.id);
    expect(stillArchived?.archivedAt).not.toBeNull();

    await setProjectArchived(projectId, adminId, false);
    expect(await runEffectResult(undo)).toMatchObject({ ok: true });
    const restored = await taskRow(task.id);
    expect(restored?.archivedAt).toBeNull();
  });
});

it("hides tasks of an archived project from mobile My Work, the mobile task list and the calendar feed", async () => {
  await withProject(async ({ adminId, employeeId, projectId }) => {
    const title = `Feed task ${randomUUID().slice(0, 8)}`;
    const task = await createTask(
      adminId,
      projectId,
      title,
      [employeeId],
      "2026-01-05"
    );
    const { token } = await feed((service) => service.rotate(employeeId));
    const visible = async () => {
      const [myWork, page, calendar] = await Promise.all([
        Effect.runPromise(
          listMyWork(employeeId, { limit: 50, offset: 0, scope: "assigned" })
        ),
        Effect.runPromise(listTaskPage(employeeId, { limit: 50, mine: true })),
        feed((service) => service.render(token, new Date("2026-01-01"))),
      ]);
      return {
        calendar: calendar.includes(title),
        myWork: myWork.items.some(({ id }) => id === task.id),
        page: page.items.some(({ id }) => id === task.id),
      };
    };

    expect(await visible()).toEqual({
      calendar: true,
      myWork: true,
      page: true,
    });
    await setProjectArchived(projectId, adminId, true);
    expect(await visible()).toEqual({
      calendar: false,
      myWork: false,
      page: false,
    });
  });
});

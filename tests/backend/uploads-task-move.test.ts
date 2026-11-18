import { expect, it } from "bun:test";
import { randomUUID } from "node:crypto";

import { Effect } from "effect";

import { authPool } from "../../src/server/auth/database";
import { Uploads } from "../../src/server/storage/uploads-contracts";
import { WorkManagement } from "../../src/server/work/work-management";
import {
  createTask,
  fileRow,
  insertFile,
  removeUploadFixture,
  runUploads,
  runWork,
  seedUploadFixture,
} from "./support/upload-state-fixtures";
import type { UploadFixture } from "./support/upload-state-fixtures";

const moveTask = (
  fixture: UploadFixture,
  task: { readonly id: string; readonly version: number }
) =>
  runWork(
    Effect.gen(function* move() {
      const work = yield* WorkManagement;
      return yield* work.moveTask(
        fixture.actorId,
        task.id,
        fixture.projectIds[1],
        task.version
      );
    })
  );

const insertIntent = async (
  fixture: UploadFixture,
  taskId: string,
  expiresIn: string
) => {
  const intentId = randomUUID();
  await authPool.query(
    `INSERT INTO upload_intent (id, "ownerId", "taskId", "projectId", "objectKey", "fileName", "contentType", "sizeBytes", state, "expiresAt")
     VALUES ($1, $2, $3, $4, $5, 'notes.pdf', 'application/pdf', 64, 'pending', now() + $6::interval)`,
    [
      intentId,
      fixture.actorId,
      taskId,
      fixture.projectIds[0],
      `company/tasks/${taskId}/${intentId}`,
      expiresIn,
    ]
  );
  return intentId;
};

const taskProject = async (taskId: string) => {
  const rows = await authPool.query(
    'SELECT "projectId" FROM task WHERE id = $1',
    [taskId]
  );
  return String(rows.rows[0]?.projectId);
};

it("lets an expired pending upload stop blocking a task move, while a live one still blocks it", async () => {
  const fixture = await seedUploadFixture();
  try {
    const blockedTask = await createTask(fixture, "Live upload");
    await insertIntent(fixture, blockedTask.id, "10 minutes");
    const freeTask = await createTask(fixture, "Expired upload");
    await insertIntent(fixture, freeTask.id, "-1 minute");

    const blocked = await moveTask(fixture, blockedTask);
    const moved = await moveTask(fixture, freeTask);

    expect(blocked).toMatchObject({ error: { code: "CONFLICT" }, ok: false });
    expect(moved).toMatchObject({
      data: { projectId: fixture.projectIds[1] },
      ok: true,
    });
  } finally {
    await removeUploadFixture(fixture);
  }
});

it("records a finalized task file in the task's current project, not the one copied into the intent", async () => {
  const fixture = await seedUploadFixture();
  try {
    const task = await createTask(fixture);
    const premove = await moveTask(fixture, task);
    expect(premove.ok).toBe(true);
    // The state a request racing the move used to leave behind: an intent
    // that still names the old project.
    const intentId = await insertIntent(fixture, task.id, "10 minutes");

    const finalized = await runUploads(
      Effect.gen(function* finalize() {
        const uploads = yield* Uploads;
        return yield* uploads.finalizeUpload(fixture.actorId, intentId);
      })
    );

    expect(finalized).toMatchObject({
      data: { projectId: fixture.projectIds[1] },
      ok: true,
    });
  } finally {
    await removeUploadFixture(fixture);
  }
});

// One task races an upload request and a copy request against its move.
const raceRound = async (fixture: UploadFixture, round: number) => {
  const task = await createTask(fixture, `Race ${round}`);
  const sourceId = await insertFile(fixture, task.id);
  const [ticket, copy, move] = await Promise.all([
    runUploads(
      Effect.gen(function* request() {
        const uploads = yield* Uploads;
        return yield* uploads.requestTaskUpload(fixture.actorId, {
          contentType: "application/pdf",
          fileName: "race.pdf",
          sizeBytes: 64,
          taskId: task.id,
        });
      })
    ),
    runUploads(
      Effect.gen(function* duplicate() {
        const uploads = yield* Uploads;
        return yield* uploads.requestFileCopy(fixture.actorId, sourceId);
      })
    ),
    moveTask(fixture, task),
  ]);
  if (!ticket.ok || !copy.ok) {
    throw new Error("The upload and the copy request should both succeed.");
  }
  const [current, intent, copied] = await Promise.all([
    taskProject(task.id),
    authPool.query('SELECT "projectId" FROM upload_intent WHERE id = $1', [
      ticket.data.uploadIntentId,
    ]),
    fileRow(copy.data.fileId),
  ]);
  return {
    copyProject: copied?.projectId,
    current,
    intentProject: String(intent.rows[0]?.projectId),
    moved: move.ok,
  };
};

it("never leaves an upload intent or a file copy in the old project when it races a task move", async () => {
  const fixture = await seedUploadFixture();
  try {
    const rounds = await Promise.all(
      [0, 1, 2, 3].map((round) => raceRound(fixture, round))
    );

    for (const round of rounds) {
      expect(round.intentProject).toBe(round.current);
      expect(round.copyProject).toBe(round.current);
      // A move that saw the pending intent was refused; one that won the
      // lock moved the task before the intent was created.
      expect(round.moved).toBe(round.current === fixture.projectIds[1]);
    }
  } finally {
    await removeUploadFixture(fixture);
  }
});

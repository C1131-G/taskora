import { afterAll, beforeAll, expect, it } from "bun:test";
import { randomUUID } from "node:crypto";

import { Effect, Exit, Layer } from "effect";

import { Storage } from "../../src/server/storage/storage";
import { UploadsLive } from "../../src/server/storage/uploads";
import { Uploads } from "../../src/server/storage/uploads-contracts";
import { authPool, callAs, ids, personaId } from "./support/action-harness";
import {
  cancel,
  clear,
  codeOf,
  fixture,
  okData,
  portalQueries,
  requestMilestone,
  requestTask,
  setupApprovalState,
  statusOf,
  teardownApprovalState,
  decide,
  insertMilestone,
} from "./support/approval-state-fixture";
import type { Receipt } from "./support/approval-state-fixture";

beforeAll(setupApprovalState);
afterAll(teardownApprovalState);

it("does not let the client decide a request whose milestone was deleted", async () => {
  await clear();
  const milestoneId = randomUUID();
  await insertMilestone(milestoneId, "Doomed milestone");
  const asked = okData<Receipt>(await requestMilestone(milestoneId));
  const detail = async () =>
    okData<{ readonly canDecide: boolean }>(
      await callAs("client", portalQueries.getPortalApproval, {
        approvalId: asked.id,
      })
    );
  const open = await detail();
  expect(open.canDecide).toBe(true);
  await authPool.query("DELETE FROM project_milestone WHERE id = $1", [
    milestoneId,
  ]);
  const gone = await detail();
  expect(gone.canDecide).toBe(false);
  expect(codeOf(await decide(asked.id))).toBe("CONFLICT");
  expect(await statusOf(asked.id)).toBe("pending");
  // The team can still take it back.
  okData(await cancel("admin", asked.id));
});

it("waits for a milestone deletion in flight and then refuses the decision", async () => {
  await clear();
  const milestoneId = randomUUID();
  await insertMilestone(milestoneId, "Racing milestone");
  const asked = okData<Receipt>(await requestMilestone(milestoneId));
  const deleter = await authPool.connect();
  try {
    await deleter.query("BEGIN");
    await deleter.query("DELETE FROM project_milestone WHERE id = $1", [
      milestoneId,
    ]);
    let settled = false;
    const decision = decide(asked.id).finally(() => {
      settled = true;
    });
    await Bun.sleep(300);
    expect(settled).toBe(false);
    await deleter.query("COMMIT");
    expect(codeOf(await decision)).toBe("CONFLICT");
  } finally {
    deleter.release();
  }
  expect(await statusOf(asked.id)).toBe("pending");
});

it("refuses a request for a file whose removal commits while it waits", async () => {
  await clear();
  const remover = await authPool.connect();
  try {
    await remover.query("BEGIN");
    await remover.query(
      'UPDATE file_asset SET "deletedAt" = now(), "deletedById" = $2 WHERE id = $1',
      [fixture.taskFileId, personaId("owner")]
    );
    let settled = false;
    const request = requestTask("owner").finally(() => {
      settled = true;
    });
    await Bun.sleep(300);
    expect(settled).toBe(false);
    await remover.query("COMMIT");
    expect(codeOf(await request)).toBe("VALIDATION_FAILED");
  } finally {
    remover.release();
  }
  const rows = await authPool.query(
    'SELECT id FROM approval_request WHERE "taskId" = $1',
    [fixture.taskId]
  );
  expect(rows.rowCount).toBe(0);
});

const storageLayer = Layer.succeed(
  Storage,
  Storage.of({
    copyObject: () => Effect.void,
    deleteObject: () => Effect.void,
    listObjects: () => Effect.succeed([]),
    signDownload: () => Effect.succeed("https://private.example/download"),
    signPreview: () => Effect.succeed("https://private.example/preview"),
    signUpload: () => Effect.succeed("https://private.example/upload"),
    verifyObject: () => Effect.void,
  })
);

const removeFile = (actorId: string, fileId: string) =>
  Effect.runPromiseExit(
    Effect.provide(
      Effect.gen(function* run() {
        const uploads = yield* Uploads;
        return yield* uploads.removeFile(actorId, fileId);
      }),
      Layer.provide(UploadsLive, storageLayer)
    )
  );

it("keeps a file when an approval request listing it commits during the removal", async () => {
  await clear();
  const requestId = randomUUID();
  const requester = await authPool.connect();
  try {
    // What requestApproval does: lock the files, then attach them.
    await requester.query("BEGIN");
    await requester.query("SELECT id FROM file_asset WHERE id = $1 FOR SHARE", [
      fixture.taskFileId,
    ]);
    await requester.query(
      `INSERT INTO approval_request (id, "companyId", "projectId", "taskId", "subjectKey", "subjectTitle", version, status, message, "requestedById", "requestedAt")
       VALUES ($1, $2, $3, $4, $5, 'State fixes task', 1, 'pending', 'Review', $6, now())`,
      [
        requestId,
        ids.clientCompanyId,
        fixture.projectId,
        fixture.taskId,
        `task:${fixture.taskId}`,
        personaId("owner"),
      ]
    );
    await requester.query(
      'INSERT INTO approval_request_file (id, "requestId", "fileId") VALUES ($1, $2, $3)',
      [randomUUID(), requestId, fixture.taskFileId]
    );
    let settled = false;
    const removal = removeFile(personaId("admin"), fixture.taskFileId).finally(
      () => {
        settled = true;
      }
    );
    await Bun.sleep(300);
    expect(settled).toBe(false);
    await requester.query("COMMIT");
    const exit = await removal;
    expect(Exit.isFailure(exit) && JSON.stringify(exit.cause)).toContain(
      "CONFLICT"
    );
  } finally {
    requester.release();
  }
  const file = await authPool.query<{ deletedAt: Date | null }>(
    'SELECT "deletedAt" FROM file_asset WHERE id = $1',
    [fixture.taskFileId]
  );
  expect(file.rows[0]?.deletedAt).toBeNull();
});

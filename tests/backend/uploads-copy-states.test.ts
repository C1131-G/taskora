import { expect, it } from "bun:test";

import { Effect } from "effect";

import { authPool } from "../../src/server/auth/database";
import { AppError } from "../../src/server/core/action-result";
import { Uploads } from "../../src/server/storage/uploads-contracts";
import {
  createTask,
  fakeStorage,
  fileRow,
  insertFile,
  removeUploadFixture,
  runUploads,
  seedUploadFixture,
} from "./support/upload-state-fixtures";

const requestCopy = (actorId: string, fileId: string) =>
  runUploads(
    Effect.gen(function* duplicate() {
      const uploads = yield* Uploads;
      return yield* uploads.requestFileCopy(actorId, fileId);
    })
  );

const copyPayload = async (targetFileId: string) => {
  const rows = await authPool.query(
    "SELECT payload->>'sourceFileId' AS source, payload->>'sourceKey' AS \"sourceKey\", payload->>'targetKey' AS \"targetKey\" FROM job WHERE kind = 'storage.copy-file' AND payload->>'targetFileId' = $1",
    [targetFileId]
  );
  const [row] = rows.rows;
  if (!row) {
    throw new Error("The copy job was not queued.");
  }
  return {
    sourceFileId: String(row.source),
    sourceKey: String(row.sourceKey),
    targetKey: String(row.targetKey),
  };
};

const processCopy = (
  targetFileId: string,
  payload: Awaited<ReturnType<typeof copyPayload>>,
  storage = fakeStorage()
) =>
  runUploads(
    Effect.gen(function* run() {
      const uploads = yield* Uploads;
      yield* uploads.processFileCopy(
        payload.sourceFileId,
        targetFileId,
        payload.sourceKey,
        payload.targetKey
      );
    }),
    storage
  );

it("marks a copy failed and fails the job permanently when its source is removed before the job runs", async () => {
  const fixture = await seedUploadFixture();
  try {
    const task = await createTask(fixture);
    const sourceId = await insertFile(fixture, task.id);
    const copy = await requestCopy(fixture.actorId, sourceId);
    if (!copy.ok) {
      throw new Error(copy.error.message);
    }
    const payload = await copyPayload(copy.data.fileId);
    await authPool.query(
      'UPDATE file_asset SET "deletedAt" = now(), "deletedById" = $2 WHERE id = $1',
      [sourceId, fixture.actorId]
    );

    const first = await processCopy(copy.data.fileId, payload);
    const replay = await processCopy(copy.data.fileId, payload);

    // NOT_FOUND is a permanent job failure, so the job stops retrying.
    expect(first).toMatchObject({ error: { code: "NOT_FOUND" }, ok: false });
    expect(replay).toMatchObject({ error: { code: "NOT_FOUND" }, ok: false });
    expect(await fileRow(copy.data.fileId)).toMatchObject({
      copyError: "The source file changed or was removed.",
      copyState: "failed",
    });
  } finally {
    await removeUploadFixture(fixture);
  }
});

it("marks a removed copy failed, so undoing the removal never brings back a copy stuck in pending", async () => {
  const fixture = await seedUploadFixture();
  try {
    const task = await createTask(fixture);
    const sourceId = await insertFile(fixture, task.id);
    const copy = await requestCopy(fixture.actorId, sourceId);
    if (!copy.ok) {
      throw new Error(copy.error.message);
    }
    const payload = await copyPayload(copy.data.fileId);
    await authPool.query(
      'UPDATE file_asset SET "deletedAt" = now(), "deletedById" = $2 WHERE id = $1',
      [copy.data.fileId, fixture.actorId]
    );

    const result = await processCopy(copy.data.fileId, payload);

    expect(result).toMatchObject({ error: { code: "NOT_FOUND" }, ok: false });
    expect(await fileRow(copy.data.fileId)).toMatchObject({
      copyState: "failed",
    });
  } finally {
    await removeUploadFixture(fixture);
  }
});

it("keeps a finished copy ready when a stale worker's storage copy fails afterwards, and a replay is a no-op", async () => {
  const fixture = await seedUploadFixture();
  try {
    const task = await createTask(fixture);
    const sourceId = await insertFile(fixture, task.id);
    const copy = await requestCopy(fixture.actorId, sourceId);
    if (!copy.ok) {
      throw new Error(copy.error.message);
    }
    const payload = await copyPayload(copy.data.fileId);
    const staleGate = Promise.withResolvers<boolean>();
    const staleInCopy = Promise.withResolvers<boolean>();
    const staleWorker = processCopy(
      copy.data.fileId,
      payload,
      fakeStorage({
        copyObject: () =>
          Effect.flatMap(
            Effect.promise(() => {
              staleInCopy.resolve(true);
              return staleGate.promise;
            }),
            (failed) =>
              failed
                ? Effect.fail(
                    new AppError({
                      code: "UNAVAILABLE",
                      message: "Private file storage is unavailable.",
                    })
                  )
                : Effect.void
          ),
      })
    );
    await staleInCopy.promise;

    const fresh = await processCopy(copy.data.fileId, payload);
    staleGate.resolve(true);
    const stale = await staleWorker;
    let replayCopies = 0;
    const replay = await processCopy(
      copy.data.fileId,
      payload,
      fakeStorage({
        copyObject: () => {
          replayCopies += 1;
          return Effect.void;
        },
      })
    );

    expect(fresh.ok).toBe(true);
    expect(stale).toMatchObject({ error: { code: "UNAVAILABLE" }, ok: false });
    expect(await fileRow(copy.data.fileId)).toMatchObject({
      copyError: null,
      copyState: "ready",
    });
    expect(replay.ok).toBe(true);
    expect(replayCopies).toBe(0);
  } finally {
    await removeUploadFixture(fixture);
  }
});

it("moves a failed copy back to pending only when the next attempt starts", async () => {
  const fixture = await seedUploadFixture();
  try {
    const task = await createTask(fixture);
    const sourceId = await insertFile(fixture, task.id);
    const copy = await requestCopy(fixture.actorId, sourceId);
    if (!copy.ok) {
      throw new Error(copy.error.message);
    }
    const payload = await copyPayload(copy.data.fileId);
    const failing = fakeStorage({
      copyObject: () =>
        Effect.fail(
          new AppError({ code: "UNAVAILABLE", message: "Storage is down." })
        ),
    });

    const failed = await processCopy(copy.data.fileId, payload, failing);
    const afterFailure = await fileRow(copy.data.fileId);
    const retried = await processCopy(copy.data.fileId, payload);

    expect(failed.ok).toBe(false);
    expect(afterFailure).toMatchObject({
      copyError: "Storage copy failed.",
      copyState: "failed",
    });
    expect(retried.ok).toBe(true);
    expect(await fileRow(copy.data.fileId)).toMatchObject({
      copyError: null,
      copyState: "ready",
    });
  } finally {
    await removeUploadFixture(fixture);
  }
});

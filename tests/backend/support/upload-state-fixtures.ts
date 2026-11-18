import { randomUUID } from "node:crypto";

import { Effect, Layer } from "effect";

import { authPool } from "../../../src/server/auth/database";
import { runEffectResult } from "../../../src/server/core/action-result";
import { Storage } from "../../../src/server/storage/storage";
import type { StorageApi } from "../../../src/server/storage/storage";
import { UploadsLive } from "../../../src/server/storage/uploads";
import type { Uploads } from "../../../src/server/storage/uploads-contracts";
import {
  WorkManagement,
  WorkManagementLive,
} from "../../../src/server/work/work-management";

process.env["BETTER_AUTH_SECRET"] ??=
  "test-only-secret-that-is-at-least-thirty-two-characters";

export interface UploadFixture {
  readonly actorId: string;
  readonly projectIds: readonly [string, string];
}

// A storage double that accepts every call; tests override what they watch.
export const fakeStorage = (
  overrides: Partial<StorageApi> = {}
): StorageApi => ({
  copyObject: () => Effect.void,
  deleteObject: () => Effect.void,
  signDownload: (key) => Effect.succeed(`https://private.example/${key}`),
  signPreview: (key) => Effect.succeed(`https://private.example/${key}`),
  signUpload: (key) => Effect.succeed(`https://private.example/upload/${key}`),
  verifyObject: () => Effect.void,
  ...overrides,
});

export const runUploads = <Value, Failure>(
  program: Effect.Effect<Value, Failure, Uploads>,
  storage: StorageApi = fakeStorage()
) =>
  runEffectResult(
    Effect.provide(
      program,
      Layer.provide(UploadsLive, Layer.succeed(Storage, Storage.of(storage)))
    )
  );

export const runWork = <Value, Failure>(
  program: Effect.Effect<Value, Failure, WorkManagement>
) => runEffectResult(Effect.provide(program, WorkManagementLive));

export const seedUploadFixture = async (
  role: "admin" | "employee" = "employee"
): Promise<UploadFixture> => {
  const actorId = randomUUID();
  const suffix = randomUUID().replaceAll("-", "").slice(0, 5).toUpperCase();
  const projectIds: [string, string] = [randomUUID(), randomUUID()];
  await authPool.query(
    'INSERT INTO "user" (id, name, email, "emailNormalized", role, "mustChangePassword") VALUES ($1, $2, $3, $3, $4, false)',
    [actorId, "Upload State Owner", `${actorId}@upload-states.example`, role]
  );
  await authPool.query(
    "INSERT INTO project (id, key, name) VALUES ($1, $2, $3), ($4, $5, $6)",
    [
      projectIds[0],
      `U${suffix}`,
      "Upload source",
      projectIds[1],
      `V${suffix}`,
      "Upload destination",
    ]
  );
  return { actorId, projectIds };
};

export const createTask = async (
  fixture: UploadFixture,
  title = "Upload state task"
) => {
  const created = await runWork(
    Effect.gen(function* create() {
      const work = yield* WorkManagement;
      return yield* work.createTask(fixture.actorId, {
        assigneeIds: [],
        description: null,
        dueDate: null,
        priority: "none",
        projectId: fixture.projectIds[0],
        title,
      });
    })
  );
  if (!created.ok) {
    throw new Error(created.error.message);
  }
  return created.data;
};

export const insertFile = async (
  fixture: UploadFixture,
  taskId: string,
  storageKey = `company/tasks/${taskId}/${randomUUID()}`
) => {
  const fileId = randomUUID();
  await authPool.query(
    'INSERT INTO file_asset (id, "projectId", "taskId", "uploadedById", "originalName", "storageKey", "contentType", "sizeBytes") VALUES ($1, $2, $3, $4, $5, $6, $7, $8)',
    [
      fileId,
      fixture.projectIds[0],
      taskId,
      fixture.actorId,
      "design.pdf",
      storageKey,
      "application/pdf",
      2048,
    ]
  );
  return fileId;
};

export const removeUploadFixture = async ({
  actorId,
  projectIds,
}: UploadFixture) => {
  await authPool.query(
    "DELETE FROM job WHERE kind = 'storage.copy-file' AND payload->>'targetFileId' IN (SELECT id::text FROM file_asset WHERE \"uploadedById\" = $1)",
    [actorId]
  );
  await authPool.query(
    "DELETE FROM job WHERE kind = 'storage.delete-avatar' AND payload->>'objectKey' LIKE $1",
    [`company/avatars/${actorId}/%`]
  );
  await authPool.query('DELETE FROM undo_record WHERE "actorId" = $1', [
    actorId,
  ]);
  await authPool.query('DELETE FROM activity WHERE "actorId" = $1', [actorId]);
  await authPool.query('DELETE FROM file_asset WHERE "uploadedById" = $1', [
    actorId,
  ]);
  await authPool.query('DELETE FROM upload_intent WHERE "ownerId" = $1', [
    actorId,
  ]);
  await authPool.query('DELETE FROM task WHERE "projectId" = ANY($1::uuid[])', [
    projectIds,
  ]);
  await authPool.query("DELETE FROM project WHERE id = ANY($1::uuid[])", [
    projectIds,
  ]);
  await authPool.query('DELETE FROM "user" WHERE id = $1', [actorId]);
};

export const fileRow = async (fileId: string) => {
  const rows = await authPool.query(
    'SELECT "projectId", "copyState", "copyError", "deletedAt" FROM file_asset WHERE id = $1',
    [fileId]
  );
  return rows.rows[0];
};

import { randomUUID } from "node:crypto";

import { and, or } from "@prisma/orm-postgres/orm-client";
import { Effect } from "effect";

import { db } from "@/src/prisma/db";

import { AppError } from "../core/action-result";
import type { StorageApi } from "./storage";
import { decodeFileCopyState } from "./upload-states";
import type { FileCopyState } from "./upload-states";
import type { FileCopyResult } from "./uploads-contracts";
import * as internal from "./uploads-internal";

export const requestFileCopy = (
  actorId: string,
  fileId: string
): Effect.Effect<FileCopyResult, AppError> =>
  Effect.tryPromise({
    catch: internal.mapError,
    try: () =>
      db.transaction(async (transaction) => {
        const [actor, source] = await Promise.all([
          internal.getActor(transaction, actorId),
          transaction.orm.public.FileAsset.where({
            deletedAt: null,
            id: fileId,
          }).first(),
        ]);
        if (!source || decodeFileCopyState(source.copyState) !== "ready") {
          throw new AppError({
            code: "NOT_FOUND",
            message: "The ready file was not found.",
          });
        }
        let { projectId } = source;
        if (source.taskId) {
          await internal.getEditableTask(transaction, actor, source.taskId);
          // The copy goes to the task's current project, and a task move
          // waits for this transaction so it also moves the new copy.
          projectId = await internal.lockTaskProject(
            transaction,
            source.taskId
          );
        } else {
          if (actor.role !== "admin") {
            throw new AppError({
              code: "FORBIDDEN",
              message: "Only admins can duplicate standalone project files.",
            });
          }
          await internal.assertActiveFileLocation(
            transaction,
            actor.role,
            null,
            source.projectId
          );
        }
        const now = new Date();
        const targetFileId = randomUUID();
        const targetKey = `company/files/${projectId}/${randomUUID()}`;
        const dot = source.originalName.lastIndexOf(".");
        const fileName =
          dot > 0
            ? `${source.originalName.slice(0, dot)} copy${source.originalName.slice(dot)}`
            : `${source.originalName} copy`;
        const target = await transaction.orm.public.FileAsset.create({
          contentType: source.contentType,
          copyError: null,
          copyState: "pending" satisfies FileCopyState,
          createdAt: now,
          deletedAt: null,
          deletedById: null,
          id: targetFileId,
          originalName: internal.normalizeFileName(fileName),
          projectId,
          sizeBytes: source.sizeBytes,
          storageKey: targetKey,
          taskId: source.taskId,
          uploadedById: actorId,
        });
        await transaction.orm.public.Job.create({
          availableAt: now,
          createdAt: now,
          dedupeKey: `storage.copy-file:${targetFileId}`,
          id: randomUUID(),
          kind: "storage.copy-file",
          payload: {
            sourceFileId: source.id,
            sourceKey: source.storageKey,
            targetFileId,
            targetKey,
          },
          updatedAt: now,
        });
        await internal.addActivity(
          transaction,
          actorId,
          source.taskId,
          projectId,
          "file.duplicate_requested",
          {
            duplicateFileId: targetFileId,
            fileId: source.id,
          }
        );
        return { fileId: target.id, state: "pending" as const };
      }),
  });

const unfinishedCopy = (targetFileId: string) =>
  db.orm.public.FileAsset.where((file) =>
    and(
      file.id.eq(targetFileId),
      or(
        file.copyState.eq("pending" satisfies FileCopyState),
        file.copyState.eq("failed" satisfies FileCopyState)
      )
    )
  );

// The first step of a copy job run. A finished copy makes a replay a no-op. A
// copy whose source or target is gone or changed can never finish, so it is
// marked failed and the job fails permanently instead of retrying until it
// dies with the copy still pending. A failed copy goes back to pending for
// this attempt; a pending one stays as it is.
const startFileCopy = async (
  sourceFileId: string,
  targetFileId: string,
  sourceKey: string,
  targetKey: string
): Promise<"already-ready" | "started"> => {
  const [source, target] = await Promise.all([
    db.orm.public.FileAsset.where({
      deletedAt: null,
      id: sourceFileId,
    }).first(),
    db.orm.public.FileAsset.where({
      deletedAt: null,
      id: targetFileId,
    }).first(),
  ]);
  const targetState = target ? decodeFileCopyState(target.copyState) : null;
  if (targetState === "ready") {
    return "already-ready";
  }
  if (
    !source ||
    !target ||
    source.storageKey !== sourceKey ||
    target.storageKey !== targetKey ||
    !sourceKey.startsWith("company/") ||
    !targetKey.startsWith("company/files/")
  ) {
    await unfinishedCopy(targetFileId).updateAndCount({
      copyError: "The source file changed or was removed.",
      copyState: "failed" satisfies FileCopyState,
    });
    throw new AppError({
      code: "NOT_FOUND",
      message: "The file copy request is no longer valid.",
    });
  }
  if (targetState === "failed") {
    await db.orm.public.FileAsset.where({
      copyState: "failed" satisfies FileCopyState,
      deletedAt: null,
      id: targetFileId,
    }).updateAndCount({
      copyError: null,
      copyState: "pending" satisfies FileCopyState,
    });
  }
  return "started";
};

export const makeFileCopyOperations = (storage: StorageApi) => {
  const processFileCopy = (
    sourceFileId: string,
    targetFileId: string,
    sourceKey: string,
    targetKey: string
  ): Effect.Effect<void, AppError> =>
    Effect.gen(function* processCopy() {
      const step = yield* Effect.tryPromise({
        catch: internal.mapError,
        try: () =>
          startFileCopy(sourceFileId, targetFileId, sourceKey, targetKey),
      });
      if (step === "already-ready") {
        return;
      }
      const copied = yield* Effect.result(
        storage.copyObject(sourceKey, targetKey)
      );
      if (copied._tag === "Failure") {
        yield* Effect.tryPromise({
          catch: internal.mapError,
          try: () =>
            // Only the run that still sees a pending copy may fail it, so a
            // stale worker never overwrites a copy another run finished.
            db.orm.public.FileAsset.where({
              copyState: "pending" satisfies FileCopyState,
              deletedAt: null,
              id: targetFileId,
            }).updateAndCount({
              copyError: "Storage copy failed.",
              copyState: "failed" satisfies FileCopyState,
            }),
        });
        return yield* Effect.fail(copied.failure);
      }
      yield* Effect.tryPromise({
        catch: internal.mapError,
        try: async () => {
          const updated = await db.orm.public.FileAsset.where({
            copyState: "pending" satisfies FileCopyState,
            deletedAt: null,
            id: targetFileId,
          }).updateAndCount({
            copyError: null,
            copyState: "ready" satisfies FileCopyState,
          });
          if (!updated) {
            throw new AppError({
              code: "CONFLICT",
              message: "The copied file was removed before completion.",
            });
          }
        },
      });
    });

  return { processFileCopy };
};

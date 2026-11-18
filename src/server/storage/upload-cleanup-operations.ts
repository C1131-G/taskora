import { and } from "@prisma/orm-postgres/orm-client";
import { Effect } from "effect";

import { db } from "@/src/prisma/db";

import type { AppError } from "../core/action-result";
import { isForeignKeyViolation } from "../core/prisma-errors";
import type { StorageApi } from "./storage";
import type { UploadIntentState } from "./upload-states";
import * as internal from "./uploads-internal";

// Every prefix the app writes objects under. An object under one of them that
// no file, live upload intent or user avatar names is an orphan.
const SWEPT_PREFIXES = [
  "company/tasks/",
  "company/files/",
  "company/avatars/",
  "company/client-logos/",
  "company/intake/",
] as const;

export const makeUploadCleanupOperations = (storage: StorageApi) => {
  // The database change has already committed when an object is deleted, so a
  // failed delete must not stop the run: the orphan sweep removes the object
  // on a later run because nothing names it any more.
  const deleteObjectOrLeave = (key: string): Effect.Effect<boolean> =>
    storage.deleteObject(key).pipe(
      Effect.as(true),
      Effect.orElseSucceed(() => false)
    );
  const cleanupExpiredUploads = (): Effect.Effect<
    {
      readonly filesRemoved: number;
      readonly intentsRemoved: number;
      readonly orphansRemoved: number;
    },
    AppError
  > =>
    Effect.gen(function* cleanupExpiredUploadData() {
      const now = new Date();
      yield* Effect.tryPromise({
        catch: internal.mapError,
        try: () =>
          db.orm.public.IdempotencyKey.where((record) =>
            record.expiresAt.lte(now)
          ).deleteAll(),
      });
      const expiredIntents = yield* Effect.tryPromise({
        catch: internal.mapError,
        try: () =>
          db.orm.public.UploadIntent.where((intent) =>
            and(
              intent.state.eq("pending" satisfies UploadIntentState),
              intent.expiresAt.lte(now)
            )
          )
            .orderBy((intent) => intent.expiresAt.asc())
            .limit(100)
            .all(),
      });
      let intentsRemoved = 0;
      for (const intent of expiredIntents) {
        const updated = yield* Effect.tryPromise({
          catch: internal.mapError,
          try: () =>
            db.orm.public.UploadIntent.where({
              id: intent.id,
              state: "pending" satisfies UploadIntentState,
            }).updateAndCount({
              removedAt: now,
              state: "removed" satisfies UploadIntentState,
              updatedAt: now,
            }),
        });
        if (updated) {
          yield* deleteObjectOrLeave(intent.objectKey);
          intentsRemoved += 1;
        }
      }

      const removalCutoff = new Date(now.getTime() - internal.UNDO_LIFETIME_MS);
      const expiredRemovedFiles = yield* Effect.tryPromise({
        catch: internal.mapError,
        try: () =>
          db.orm.public.FileAsset.where((file) =>
            file.deletedAt.lte(removalCutoff)
          )
            .orderBy((file) => file.deletedAt.asc())
            .limit(100)
            .all(),
      });
      let filesRemoved = 0;
      for (const file of expiredRemovedFiles) {
        const activeUndo = yield* Effect.tryPromise({
          catch: internal.mapError,
          try: () =>
            db.orm.public.UndoRecord.where((undo) =>
              and(
                undo.action.eq("file.remove"),
                undo.entityId.eq(file.id),
                undo.consumedAt.isNull(),
                undo.expiresAt.gt(now)
              )
            )
              .select("id")
              .first(),
        });
        if (activeUndo) {
          continue;
        }
        // An approval request keeps a hard reference to the files it lists, so
        // a removed file on one cannot be deleted for good yet. Skip it and
        // carry on, or the oldest such file would stop every run.
        const deleted = yield* Effect.tryPromise({
          catch: (error) => error,
          try: () =>
            db.orm.public.FileAsset.where((current) =>
              and(current.id.eq(file.id), current.deletedAt.lte(removalCutoff))
            ).delete(),
        }).pipe(
          Effect.catch((error) =>
            isForeignKeyViolation(error)
              ? Effect.succeed(null)
              : Effect.fail(internal.mapError(error))
          )
        );
        if (deleted) {
          yield* deleteObjectOrLeave(file.storageKey);
          filesRemoved += 1;
        }
      }
      const { listObjects } = storage;
      if (!listObjects) {
        return { filesRemoved, intentsRemoved, orphansRemoved: 0 };
      }
      const [files, intents, avatars] = yield* Effect.tryPromise({
        catch: internal.mapError,
        try: () =>
          Promise.all([
            db.orm.public.FileAsset.select("storageKey").all(),
            db.orm.public.UploadIntent.where((intent) =>
              intent.state.neq("removed" satisfies UploadIntentState)
            )
              .select("objectKey")
              .all(),
            db.orm.public.User.where((user) => user.image.isNotNull())
              .select("image")
              .all(),
          ]),
      });
      const knownKeys = new Set<string>([
        ...files.map(({ storageKey }) => storageKey),
        ...intents.map(({ objectKey }) => objectKey),
        ...avatars.flatMap(({ image }) => (image ? [image] : [])),
      ]);
      const orphanCutoff = new Date(
        now.getTime() - internal.ORPHAN_GRACE_PERIOD_MS
      );
      const listed = yield* Effect.forEach(SWEPT_PREFIXES, listObjects, {
        concurrency: 2,
      });
      const orphanKeys = listed
        .flat()
        .filter(
          ({ key, lastModified }) =>
            !knownKeys.has(key) &&
            lastModified !== null &&
            lastModified < orphanCutoff
        )
        .slice(0, 100)
        .map(({ key }) => key);
      const orphanDeletes = yield* Effect.forEach(
        orphanKeys,
        deleteObjectOrLeave,
        { concurrency: 10 }
      );
      return {
        filesRemoved,
        intentsRemoved,
        orphansRemoved: orphanDeletes.filter(Boolean).length,
      };
    });

  return { cleanupExpiredUploads };
};

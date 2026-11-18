import { randomUUID } from "node:crypto";

import { Effect, Schema } from "effect";

import { db } from "@/src/prisma/db";

import { AppError } from "../core/action-result";
import type { StorageApi } from "./storage";
import { decodeUploadIntentState } from "./upload-states";
import type { UploadIntentState } from "./upload-states";
import type { AvatarUploadResult } from "./uploads-contracts";
import * as internal from "./uploads-internal";

// Points the user at the new avatar and retires the one it replaces: its
// intent moves to removed and a job deletes its object. The user row is locked
// first, so two avatar finalizes for one user take turns and each retires the
// avatar the other one set.
const replaceAvatar = async (
  transaction: internal.Transaction,
  actorId: string,
  objectKey: string,
  now: Date
): Promise<void> => {
  await transaction.query(
    transaction.sql.public.user
      .select("id")
      .where((field, fns) => fns.eq(field.id, actorId))
      .forNoKeyUpdate()
      .build()
  );
  const previous = await transaction.orm.public.User.where({ id: actorId })
    .select("image")
    .first();
  await transaction.orm.public.User.where({ id: actorId }).update({
    image: objectKey,
    updatedAt: now,
  });
  const previousKey = previous?.image;
  if (
    !previousKey?.startsWith("company/avatars/") ||
    previousKey === objectKey
  ) {
    return;
  }
  await transaction.orm.public.UploadIntent.where({
    objectKey: previousKey,
    state: "finalized" satisfies UploadIntentState,
  }).updateAndCount({
    removedAt: now,
    state: "removed" satisfies UploadIntentState,
    updatedAt: now,
  });
  await transaction.orm.public.Job.create({
    availableAt: now,
    createdAt: now,
    dedupeKey: `storage.delete-avatar:${previousKey}`,
    id: randomUUID(),
    kind: "storage.delete-avatar",
    maxAttempts: 8,
    payload: { objectKey: previousKey },
    updatedAt: now,
  });
};

export const makeAvatarOperations = (storage: StorageApi) => {
  const finalizeAvatarUpload = (
    actorId: string,
    uploadIntentId: string
  ): Effect.Effect<AvatarUploadResult, AppError> =>
    Effect.gen(function* finalizeEmployeeAvatarUpload() {
      const intent = yield* Effect.tryPromise({
        catch: internal.mapError,
        try: () =>
          db.transaction(async (transaction) => {
            await internal.getActor(transaction, actorId);
            const found = await transaction.orm.public.UploadIntent.where({
              id: uploadIntentId,
            }).first();
            if (!found || found.ownerId !== actorId) {
              throw new AppError({
                code: "NOT_FOUND",
                message: "The avatar upload request was not found.",
              });
            }
            if (!found.objectKey.startsWith(`company/avatars/${actorId}/`)) {
              throw new AppError({
                code: "FORBIDDEN",
                message: "This upload is not an avatar request.",
              });
            }
            const state = decodeUploadIntentState(found.state);
            if (state === "finalized") {
              return { alreadyFinalized: true as const, record: found };
            }
            if (
              state !== "pending" ||
              found.expiresAt <= new Date() ||
              found.taskId ||
              found.projectId ||
              !Schema.is(internal.AvatarUploadInputSchema.fields.contentType)(
                found.contentType
              ) ||
              found.sizeBytes > BigInt(internal.MAX_AVATAR_BYTES)
            ) {
              throw new AppError({
                code: "CONFLICT",
                message: "The avatar upload request expired or changed.",
              });
            }
            return { alreadyFinalized: false as const, record: found };
          }),
      });
      if (!intent.alreadyFinalized) {
        yield* storage.verifyObject(
          intent.record.objectKey,
          intent.record.contentType,
          Number(intent.record.sizeBytes)
        );
      }
      const result = yield* Effect.tryPromise({
        catch: internal.mapError,
        try: () =>
          db.transaction(async (transaction) => {
            await internal.getActor(transaction, actorId);
            const current = await transaction.orm.public.UploadIntent.where({
              id: uploadIntentId,
              ownerId: actorId,
            }).first();
            if (!current) {
              throw new AppError({
                code: "NOT_FOUND",
                message: "The avatar upload request was not found.",
              });
            }
            if (
              !current.objectKey.startsWith(`company/avatars/${actorId}/`) ||
              !Schema.is(internal.AvatarUploadInputSchema.fields.contentType)(
                current.contentType
              )
            ) {
              throw new AppError({
                code: "CONFLICT",
                message: "The avatar upload request changed.",
              });
            }
            const state = decodeUploadIntentState(current.state);
            if (state !== "finalized") {
              if (
                state !== "pending" ||
                current.expiresAt <= new Date() ||
                current.taskId ||
                current.projectId ||
                current.sizeBytes > BigInt(internal.MAX_AVATAR_BYTES)
              ) {
                throw new AppError({
                  code: "CONFLICT",
                  message: "The avatar upload request expired or changed.",
                });
              }
              const now = new Date();
              const claimed = await transaction.orm.public.UploadIntent.where({
                id: uploadIntentId,
                state: "pending" satisfies UploadIntentState,
              }).updateAndCount({
                finalizedAt: now,
                state: "finalized" satisfies UploadIntentState,
                updatedAt: now,
              });
              if (!claimed) {
                throw new AppError({
                  code: "CONFLICT",
                  message: "The avatar upload request was already finalized.",
                });
              }
              await replaceAvatar(transaction, actorId, current.objectKey, now);
            }
            return {
              contentType: Schema.decodeUnknownSync(
                internal.AvatarUploadInputSchema.fields.contentType
              )(current.contentType),
              sizeBytes: Number(current.sizeBytes),
            };
          }),
      });
      return result;
    });

  const signedAvatar = (
    requesterId: string,
    targetUserId: string
  ): Effect.Effect<string | null, AppError> =>
    Effect.gen(function* signEmployeeAvatar() {
      yield* Effect.tryPromise({
        catch: internal.mapError,
        try: () => internal.activeRole(requesterId),
      });
      const user = yield* Effect.tryPromise({
        catch: internal.mapError,
        try: () =>
          db.orm.public.User.where({
            deactivatedAt: null,
            id: targetUserId,
          })
            .select("image")
            .first(),
      });
      const objectKey = user?.image;
      if (!objectKey?.startsWith("company/avatars/")) {
        return null;
      }
      const intent = yield* Effect.tryPromise({
        catch: internal.mapError,
        try: () =>
          db.orm.public.UploadIntent.where({
            objectKey,
            state: "finalized" satisfies UploadIntentState,
          })
            .select("contentType")
            .first(),
      });
      if (
        !intent ||
        !Schema.is(internal.AvatarUploadInputSchema.fields.contentType)(
          intent.contentType
        )
      ) {
        return null;
      }
      return yield* storage.signPreview(objectKey, intent.contentType);
    });

  return { finalizeAvatarUpload, signedAvatar };
};

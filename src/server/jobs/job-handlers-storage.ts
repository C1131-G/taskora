import { Effect, Schema } from "effect";

import { AppError } from "../core/action-result";
import type { Storage } from "../storage/storage";
import type { Uploads } from "../storage/uploads-contracts";
import { DATA_RETENTION_JOB, purgeExpiredData } from "./data-retention";
import type { JsonValue } from "./job-handlers";
import {
  DeleteAvatarPayloadSchema,
  DeleteClientLogoPayloadSchema,
  FileCopyPayloadSchema,
  decodeEmptyPayload,
} from "./job-payloads";

export const handleStorageJob =
  ({
    storage,
    uploads,
  }: {
    readonly storage: Storage["Service"];
    readonly uploads: Uploads["Service"];
  }) =>
  (
    kind: string,
    payload: JsonValue
  ): Effect.Effect<void, AppError> | undefined => {
    if (kind === "storage.cleanup-expired-uploads") {
      return decodeEmptyPayload(payload, "upload cleanup").pipe(
        Effect.flatMap(() => uploads.cleanupExpiredUploads()),
        Effect.asVoid
      );
    }
    if (kind === DATA_RETENTION_JOB) {
      return decodeEmptyPayload(payload, "data-retention").pipe(
        Effect.flatMap(() => purgeExpiredData({ now: new Date() })),
        Effect.asVoid
      );
    }
    if (kind === "storage.delete-avatar") {
      return Effect.try({
        catch: () =>
          new AppError({
            code: "VALIDATION_FAILED",
            message: "The avatar cleanup job payload is invalid.",
          }),
        try: () => Schema.decodeUnknownSync(DeleteAvatarPayloadSchema)(payload),
      }).pipe(
        Effect.flatMap(({ objectKey }) => storage.deleteObject(objectKey))
      );
    }
    if (kind === "storage.delete-client-logo") {
      return Effect.try({
        catch: () =>
          new AppError({
            code: "VALIDATION_FAILED",
            message: "The client logo cleanup job payload is invalid.",
          }),
        try: () =>
          Schema.decodeUnknownSync(DeleteClientLogoPayloadSchema)(payload),
      }).pipe(
        Effect.flatMap(({ objectKey }) => storage.deleteObject(objectKey))
      );
    }
    if (kind === "storage.copy-file") {
      return Effect.try({
        catch: () =>
          new AppError({
            code: "VALIDATION_FAILED",
            message: "The file copy job payload is invalid.",
          }),
        try: () => Schema.decodeUnknownSync(FileCopyPayloadSchema)(payload),
      }).pipe(
        Effect.flatMap(({ sourceFileId, targetFileId, sourceKey, targetKey }) =>
          uploads.processFileCopy(
            sourceFileId,
            targetFileId,
            sourceKey,
            targetKey
          )
        )
      );
    }
    return undefined;
  };

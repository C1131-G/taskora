import { Effect, Schema } from "effect";

import { isOneOf } from "@/src/lib/type-guards";

import { AppError } from "../core/action-result";
import {
  autoCloseAwaitingClient,
  autoCloseNeedsInfo,
  remindNeedsInfo,
} from "../work/bug-workflow-client-jobs";
import {
  AWAITING_CLIENT_AUTOCLOSE_JOB,
  NEEDS_INFO_AUTOCLOSE_JOB,
  NEEDS_INFO_REMINDER_JOB,
} from "../work/bug-workflow-client-support";
import type { JsonValue } from "./job-handlers";

export const ISO_DATE_LENGTH = 10;
const EmptyPayloadSchema = Schema.Struct({});
export const decodeEmptyPayload = (payload: JsonValue, jobLabel: string) =>
  Effect.try({
    catch: () =>
      new AppError({
        code: "VALIDATION_FAILED",
        message: `The ${jobLabel} job payload is invalid.`,
      }),
    try: () => Schema.decodeUnknownSync(EmptyPayloadSchema)(payload),
  });
export const DailyDueSummaryPayloadSchema = Schema.Struct({
  scheduledAt: Schema.DateFromString,
});
export const DeleteAvatarPayloadSchema = Schema.Struct({
  objectKey: Schema.String.check(
    Schema.makeFilter((objectKey) =>
      objectKey.startsWith("company/avatars/")
        ? undefined
        : "Only private avatar objects can be removed by this job."
    )
  ),
});
export const DeleteClientLogoPayloadSchema = Schema.Struct({
  objectKey: Schema.String.check(
    Schema.makeFilter((objectKey) =>
      objectKey.startsWith("company/client-logos/") &&
      !objectKey.includes("\\") &&
      !objectKey.split("/").some((part) => part === "." || part === "..")
        ? undefined
        : "Only private client logo objects can be removed by this job."
    )
  ),
});
export const FileCopyPayloadSchema = Schema.Struct({
  sourceFileId: Schema.String.check(Schema.isUUID()),
  sourceKey: Schema.String.check(
    Schema.makeFilter((key) =>
      key.startsWith("company/") &&
      !key.includes("\\") &&
      !key.split("/").some((part) => part === "." || part === "..")
        ? undefined
        : "Only private company objects can be copied."
    )
  ),
  targetFileId: Schema.String.check(Schema.isUUID()),
  targetKey: Schema.String.check(
    Schema.makeFilter((key) =>
      key.startsWith("company/files/") &&
      !key.includes("\\") &&
      !key.split("/").some((part) => part === "." || part === "..")
        ? undefined
        : "Copies must target private file storage."
    )
  ),
});
export const ClientWaitPayloadSchema = Schema.Struct({
  bugId: Schema.String.check(Schema.isUUID()),
  since: Schema.DateFromString,
});
export const clientWaitJobs = {
  [AWAITING_CLIENT_AUTOCLOSE_JOB]: autoCloseAwaitingClient,
  [NEEDS_INFO_AUTOCLOSE_JOB]: autoCloseNeedsInfo,
  [NEEDS_INFO_REMINDER_JOB]: remindNeedsInfo,
} as const;
export const isClientWaitJob = (
  kind: string
): kind is keyof typeof clientWaitJobs =>
  isOneOf(Object.keys(clientWaitJobs), kind);
export const BudgetCheckPayloadSchema = Schema.Struct({
  projectId: Schema.String.check(Schema.isUUID()),
});
export const UnpickedReminderPayloadSchema = Schema.Struct({
  bugId: Schema.String.check(Schema.isUUID()),
});
export const PushDeliveryPayloadSchema = Schema.Struct({
  actorId: Schema.String,
  body: Schema.String,
  eventType: Schema.Literals([
    "mention",
    "assignment",
    "comment",
    "update",
    "due",
    "client_bug",
    "status",
    "sla",
  ]),
  notificationId: Schema.String.check(Schema.isUUID()),
  title: Schema.String,
  url: Schema.String.check(
    Schema.makeFilter((url) =>
      url.startsWith("/") ? undefined : "Push links must be local paths."
    )
  ),
  userId: Schema.String,
});

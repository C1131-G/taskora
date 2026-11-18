import { Effect, Schema } from "effect";

import { AppError } from "../core/action-result";
import {
  EMAIL_DELIVERY_JOB,
  EMAIL_DIGEST_JOB,
  EmailJobPayloadSchema,
} from "../email/email-contracts";
import type { EmailNotifications } from "../email/email-notifications";
import type { PushNotifications } from "../notifications/push";
import type { Notifications } from "../notifications/service";
import type { JsonValue } from "./job-handlers";
import {
  DailyDueSummaryPayloadSchema,
  PushDeliveryPayloadSchema,
} from "./job-payloads";

export const handleNotificationJob =
  ({
    email,
    notifications,
    push,
  }: {
    readonly email: EmailNotifications["Service"];
    readonly notifications: Notifications["Service"];
    readonly push: PushNotifications["Service"];
  }) =>
  (
    kind: string,
    payload: JsonValue
  ): Effect.Effect<void, AppError> | undefined => {
    if (kind === "notifications.deliver-push") {
      return Effect.try({
        catch: () =>
          new AppError({
            code: "VALIDATION_FAILED",
            message: "The push delivery job payload is invalid.",
          }),
        try: () => Schema.decodeUnknownSync(PushDeliveryPayloadSchema)(payload),
      }).pipe(
        Effect.flatMap(({ userId, ...message }) =>
          push.deliver(userId, message)
        ),
        Effect.asVoid
      );
    }
    if (kind === EMAIL_DELIVERY_JOB) {
      return Effect.try({
        catch: () =>
          new AppError({
            code: "VALIDATION_FAILED",
            message: "The email delivery job payload is invalid.",
          }),
        try: () => Schema.decodeUnknownSync(EmailJobPayloadSchema)(payload),
      }).pipe(
        Effect.flatMap((message) => email.deliverNotification(message)),
        Effect.asVoid
      );
    }
    if (kind === EMAIL_DIGEST_JOB) {
      return Effect.try({
        catch: () =>
          new AppError({
            code: "VALIDATION_FAILED",
            message: "The email digest job payload is invalid.",
          }),
        try: () =>
          Schema.decodeUnknownSync(DailyDueSummaryPayloadSchema)(payload),
      }).pipe(
        Effect.flatMap(({ scheduledAt }) => email.sendDigests(scheduledAt)),
        Effect.asVoid
      );
    }
    if (kind === "notifications.daily-due-summary") {
      return Effect.try({
        catch: () =>
          new AppError({
            code: "VALIDATION_FAILED",
            message: "The due-summary job payload is invalid.",
          }),
        try: () =>
          Schema.decodeUnknownSync(DailyDueSummaryPayloadSchema)(payload),
      }).pipe(
        Effect.flatMap(({ scheduledAt }) =>
          notifications.sendDailyDueSummaries(scheduledAt)
        ),
        Effect.asVoid
      );
    }
    return undefined;
  };

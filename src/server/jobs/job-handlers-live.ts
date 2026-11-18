import { Effect, Layer } from "effect";

import { AppError } from "../core/action-result";
import {
  EmailNotifications,
  EmailNotificationsLive,
} from "../email/email-notifications";
import { MailTransportLive } from "../email/mail-transport";
import {
  PushNotifications,
  PushNotificationsLive,
} from "../notifications/push";
import { Notifications, NotificationsLive } from "../notifications/service";
import { Storage } from "../storage/storage";
import { UploadsLive } from "../storage/uploads";
import { Uploads } from "../storage/uploads-contracts";
import { JobHandlers } from "./job-handlers";
import { handleNotificationJob } from "./job-handlers-notifications";
import { handleStorageJob } from "./job-handlers-storage";
import { handleWorkJob } from "./job-handlers-work";

export const JobHandlersLive = Layer.effect(
  JobHandlers,
  Effect.gen(function* createJobHandlers() {
    const uploads = yield* Uploads;
    const storage = yield* Storage;
    const push = yield* PushNotifications;
    const notifications = yield* Notifications;
    const email = yield* EmailNotifications;
    return JobHandlers.of({
      handle: (kind, payload) =>
        handleStorageJob({ storage, uploads })(kind, payload) ??
        handleWorkJob(kind, payload) ??
        handleNotificationJob({ email, notifications, push })(kind, payload) ??
        Effect.fail(
          new AppError({
            code: "NOT_FOUND",
            message: `No worker handles the ${kind} job yet.`,
          })
        ),
    });
  })
)
  .pipe(Layer.provide(UploadsLive))
  .pipe(Layer.provide(NotificationsLive))
  .pipe(Layer.provide(PushNotificationsLive))
  .pipe(Layer.provide(EmailNotificationsLive))
  .pipe(Layer.provide(MailTransportLive));

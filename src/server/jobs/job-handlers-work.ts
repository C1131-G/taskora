import { Effect, Schema } from "effect";

import { db } from "@/src/prisma/db";

import {
  AUTOMATION_OVERDUE_SWEEP_JOB,
  AUTOMATION_RULE_JOB,
} from "../automation/automation-contracts";
import { decodeAutomationJob } from "../automation/automation-job";
import { sweepOverdueTasks } from "../automation/automation-overdue";
import { runAutomationEvent } from "../automation/automation-runner";
import {
  BUDGET_EVALUATION_JOB,
  evaluateBudgetAlerts,
} from "../budgets/budget-alerts";
import { AppError } from "../core/action-result";
import { WEBHOOK_DELIVERY_JOB } from "../webhooks/webhook-contracts";
import { deliverWebhook, liveDeliveryDeps } from "../webhooks/webhook-delivery";
import { decodeWebhookJob } from "../webhooks/webhook-job";
import { SLA_SWEEP_JOB } from "../work/bug-sla";
import { runSlaSweep } from "../work/bug-sla-sweep";
import {
  UNPICKED_REMINDER_JOB,
  remindUnpickedClientBug,
} from "../work/bug-workflow-pick";
import type { JsonValue } from "./job-handlers";
import {
  BudgetCheckPayloadSchema,
  ClientWaitPayloadSchema,
  DailyDueSummaryPayloadSchema,
  ISO_DATE_LENGTH,
  UnpickedReminderPayloadSchema,
  clientWaitJobs,
  isClientWaitJob,
} from "./job-payloads";

export const handleWorkJob = (
  kind: string,
  payload: JsonValue
): Effect.Effect<void, AppError> | undefined => {
  if (isClientWaitJob(kind)) {
    const run = clientWaitJobs[kind];
    return Effect.try({
      catch: () =>
        new AppError({
          code: "VALIDATION_FAILED",
          message: "The client follow-up job payload is invalid.",
        }),
      try: () => Schema.decodeUnknownSync(ClientWaitPayloadSchema)(payload),
    }).pipe(
      Effect.flatMap(({ bugId, since }) =>
        Effect.tryPromise({
          catch: () =>
            new AppError({
              code: "UNAVAILABLE",
              message: "The client follow-up could not be completed.",
            }),
          try: () =>
            db.transaction((transaction) => run(transaction, bugId, since)),
        })
      ),
      Effect.asVoid
    );
  }
  if (kind === BUDGET_EVALUATION_JOB) {
    return Effect.try({
      catch: () =>
        new AppError({
          code: "VALIDATION_FAILED",
          message: "The budget check payload is invalid.",
        }),
      try: () => Schema.decodeUnknownSync(BudgetCheckPayloadSchema)(payload),
    }).pipe(
      Effect.flatMap(({ projectId }) =>
        Effect.tryPromise({
          catch: () =>
            new AppError({
              code: "UNAVAILABLE",
              message: "The budget check could not be completed.",
            }),
          try: () => evaluateBudgetAlerts(projectId, new Date()),
        })
      ),
      Effect.asVoid
    );
  }
  if (kind === SLA_SWEEP_JOB) {
    return Effect.tryPromise({
      catch: () =>
        new AppError({
          code: "UNAVAILABLE",
          message: "The SLA sweep could not be completed.",
        }),
      try: () =>
        db.transaction((transaction) => runSlaSweep(transaction, new Date())),
    }).pipe(Effect.asVoid);
  }
  if (kind === UNPICKED_REMINDER_JOB) {
    return Effect.try({
      catch: () =>
        new AppError({
          code: "VALIDATION_FAILED",
          message: "The unpicked-bug reminder payload is invalid.",
        }),
      try: () =>
        Schema.decodeUnknownSync(UnpickedReminderPayloadSchema)(payload),
    }).pipe(
      Effect.flatMap(({ bugId }) =>
        Effect.tryPromise({
          catch: () =>
            new AppError({
              code: "UNAVAILABLE",
              message: "The unpicked-bug reminder could not be sent.",
            }),
          try: () =>
            db.transaction((transaction) =>
              remindUnpickedClientBug(transaction, bugId)
            ),
        })
      ),
      Effect.asVoid
    );
  }
  if (kind === AUTOMATION_OVERDUE_SWEEP_JOB) {
    return Effect.try({
      catch: () =>
        new AppError({
          code: "VALIDATION_FAILED",
          message: "The overdue sweep job payload is invalid.",
        }),
      try: () =>
        Schema.decodeUnknownSync(DailyDueSummaryPayloadSchema)(payload),
    }).pipe(
      Effect.flatMap(({ scheduledAt }) =>
        Effect.tryPromise({
          catch: () =>
            new AppError({
              code: "UNAVAILABLE",
              message: "The overdue sweep could not be completed.",
            }),
          try: () =>
            sweepOverdueTasks(
              scheduledAt.toISOString().slice(0, ISO_DATE_LENGTH),
              scheduledAt
            ),
        })
      ),
      Effect.asVoid
    );
  }
  if (kind === AUTOMATION_RULE_JOB) {
    return decodeAutomationJob(payload).pipe(
      Effect.flatMap((event) =>
        Effect.tryPromise({
          catch: () =>
            new AppError({
              code: "UNAVAILABLE",
              message: "The automation rules could not be run.",
            }),
          try: () => runAutomationEvent(event),
        })
      )
    );
  }
  if (kind === WEBHOOK_DELIVERY_JOB) {
    return decodeWebhookJob(payload).pipe(
      Effect.flatMap(({ deliveryId }) =>
        deliverWebhook(deliveryId, liveDeliveryDeps())
      )
    );
  }
  return undefined;
};

import { Cause, Effect, Exit, Schema } from "effect";

import { AUTOMATION_RULE_JOB } from "../automation/automation-contracts";
import { AutomationJobPayloadSchema } from "../automation/automation-job";
import { recordDeadAutomationJob } from "../automation/automation-runner";
import { AppError } from "../core/action-result";
import { logger } from "../core/logger";
import type { JobHandlersApi, JsonValue } from "./job-handlers";
import type {
  ClaimedJob,
  JobBatchResult,
  JobLeasePolicy,
} from "./processor-contracts";
import {
  claimJobs,
  finishJob,
  renewJobLease,
  retryJob,
} from "./processor-lease";

const errorMessage = (cause: Cause.Cause<AppError>): string => {
  const failure = Cause.findErrorOption(cause);
  if (failure._tag === "Some" && failure.value instanceof AppError) {
    return `Handler failed (${failure.value.code}).`;
  }
  return "Job handler failed unexpectedly.";
};

const isPermanentFailure = (cause: Cause.Cause<AppError>): boolean => {
  const failure = Cause.findErrorOption(cause);
  return (
    failure._tag === "Some" &&
    failure.value instanceof AppError &&
    ["NOT_FOUND", "VALIDATION_FAILED", "FORBIDDEN"].includes(failure.value.code)
  );
};

// The renewal timer ends on every exit path. A renewal that reports the lease
// gone interrupts the handler, so a second worker that claimed the job is not
// running alongside it. A renewal query that throws (a database blip) is not
// proof of loss: the next tick tries again, and finishJob/retryJob's own
// compare-and-set on the lease decides whether the outcome is recorded.
const runHandlerWithLease = async (
  job: ClaimedJob,
  workerId: string,
  handler: Effect.Effect<void, AppError>,
  leasePolicy: JobLeasePolicy
): Promise<Exit.Exit<void, AppError>> => {
  let renewalInFlight = false;
  let renewalPromise: Promise<void> | undefined;
  const lease = new AbortController();
  const timer = setInterval(() => {
    if (renewalInFlight || lease.signal.aborted) {
      return;
    }
    renewalInFlight = true;
    renewalPromise = (async () => {
      try {
        const renewed = await renewJobLease(
          job,
          workerId,
          leasePolicy.leaseDurationMs
        );
        if (!renewed) {
          lease.abort();
        }
      } catch {
        // Retried on the next tick; see above.
      } finally {
        renewalInFlight = false;
      }
    })();
  }, leasePolicy.renewalIntervalMs);
  try {
    const exit = await Effect.runPromiseExit(handler, {
      signal: lease.signal,
    });
    clearInterval(timer);
    await renewalPromise;
    return exit;
  } finally {
    clearInterval(timer);
  }
};

const workerIdSchema = Schema.String.check(
  Schema.makeFilter((workerId) =>
    workerId.trim().length > 0 && workerId.length <= 120
      ? undefined
      : "A valid worker identifier is required."
  )
);

const logDeadAutomationJob = async (
  payload: JsonValue,
  reason: string
): Promise<void> => {
  try {
    const decoded = Schema.decodeUnknownSync(AutomationJobPayloadSchema)(
      payload
    );
    await recordDeadAutomationJob(decoded, reason);
  } catch (error) {
    // The dead job is already recorded; a missing history row is not fatal.
    logger.error("A dead automation job could not be logged.", { error });
  }
};

export const makeProcessBatch =
  (handlers: JobHandlersApi, leasePolicy: JobLeasePolicy) =>
  (
    workerId: string,
    requestedLimit: number
  ): Effect.Effect<JobBatchResult, AppError> =>
    Effect.tryPromise({
      catch: (error) =>
        error instanceof AppError
          ? error
          : new AppError({
              code: "UNAVAILABLE",
              message: "The background job processor is unavailable.",
            }),
      try: async () => {
        if (!Schema.is(workerIdSchema)(workerId)) {
          throw new AppError({
            code: "VALIDATION_FAILED",
            message: "A valid worker identifier is required.",
          });
        }
        const limit = Math.max(1, Math.min(25, Math.trunc(requestedLimit)));
        const { jobs, deadLettered } = await claimJobs(
          workerId.trim(),
          limit,
          leasePolicy.leaseDurationMs
        );
        const results = await Promise.all(
          jobs.map(async (job) => {
            const exit = await runHandlerWithLease(
              job,
              workerId.trim(),
              handlers.handle(job.kind, job.payload),
              leasePolicy
            );
            if (Exit.isSuccess(exit)) {
              return (await finishJob(job, workerId.trim()))
                ? "completed"
                : "lease-lost";
            }

            const permanent = isPermanentFailure(exit.cause);
            const retryScheduled = await retryJob(
              job,
              workerId.trim(),
              errorMessage(exit.cause),
              permanent
            );
            if (!retryScheduled) {
              return "lease-lost";
            }
            const dead = permanent || job.attempts >= job.maxAttempts;
            if (dead && job.kind === AUTOMATION_RULE_JOB) {
              await logDeadAutomationJob(job.payload, errorMessage(exit.cause));
            }
            return dead ? "dead-lettered" : "retried";
          })
        );

        return {
          claimed: jobs.length,
          completed: results.filter((result) => result === "completed").length,
          deadLettered:
            deadLettered +
            results.filter((result) => result === "dead-lettered").length,
          retried: results.filter((result) => result === "retried").length,
        };
      },
    });

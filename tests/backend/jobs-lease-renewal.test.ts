import { expect, it, mock } from "bun:test";
import { randomUUID } from "node:crypto";

import { Effect, Layer } from "effect";

import { authPool } from "../../src/server/auth/database";
import { JobHandlers } from "../../src/server/jobs/job-handlers";
import {
  claimJobs,
  finishJob,
  renewJobLease,
  retryJob,
  EXHAUSTED_LEASE_ERROR,
} from "../../src/server/jobs/processor-lease";

process.env["BETTER_AUTH_SECRET"] ??=
  "test-only-secret-that-is-at-least-thirty-two-characters";

const realRenewal = renewJobLease;

// The first renewal query fails as a database blip would; later ones work.
let renewalCalls = 0;
await mock.module("../../src/server/jobs/processor-lease", () => ({
  EXHAUSTED_LEASE_ERROR,
  claimJobs,
  finishJob,
  renewJobLease: (...args: Parameters<typeof renewJobLease>) => {
    renewalCalls += 1;
    return renewalCalls === 1
      ? Promise.reject(new Error("connection reset"))
      : realRenewal(...args);
  },
  retryJob,
}));
const { JobProcessor, makeJobProcessorLayer } =
  await import("../../src/server/jobs/processor");

it("records a success after a renewal query fails while the lease is still held", async () => {
  const id = randomUUID();
  let handled = 0;
  await authPool.query(
    'INSERT INTO job (id, kind, payload, "dedupeKey", "availableAt") VALUES ($1, $2, \'{}\'::json, $3, $4)',
    [id, "test.renewal", `job-${id}`, new Date("1990-01-01T00:00:00Z")]
  );
  try {
    const result = await Effect.runPromise(
      Effect.provide(
        Effect.gen(function* processBatch() {
          const processor = yield* JobProcessor;
          return yield* processor.processBatch(`renewal-worker-${id}`, 1);
        }),
        Layer.provide(
          makeJobProcessorLayer({
            leaseDurationMs: 60_000,
            renewalIntervalMs: 20,
          }),
          Layer.succeed(
            JobHandlers,
            JobHandlers.of({
              handle: () =>
                Effect.gen(function* handler() {
                  yield* Effect.sleep("200 millis");
                  handled += 1;
                }),
            })
          )
        )
      )
    );
    expect(renewalCalls).toBeGreaterThan(1);
    expect(handled).toBe(1);
    expect(result).toEqual({
      claimed: 1,
      completed: 1,
      deadLettered: 0,
      retried: 0,
    });
    const job = await authPool.query<{ completedAt: Date | null }>(
      'SELECT "completedAt" FROM job WHERE id = $1',
      [id]
    );
    expect(job.rows[0]?.completedAt).not.toBeNull();
  } finally {
    await authPool.query("DELETE FROM job WHERE id = $1", [id]);
  }
});

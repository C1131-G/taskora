import { expect, it } from "bun:test";
import { randomUUID } from "node:crypto";

import { Effect, Layer } from "effect";

import { authPool } from "../../src/server/auth/database";
import { JobHandlers } from "../../src/server/jobs/job-handlers";
import {
  JobProcessor,
  makeJobProcessorLayer,
} from "../../src/server/jobs/processor";
import type { JobLeasePolicy } from "../../src/server/jobs/processor";
import { DEFAULT_JOB_LEASE_POLICY } from "../../src/server/jobs/processor-contracts";
import { EXHAUSTED_LEASE_ERROR } from "../../src/server/jobs/processor-lease";

process.env["BETTER_AUTH_SECRET"] ??=
  "test-only-secret-that-is-at-least-thirty-two-characters";

const insertJob = (
  id: string,
  fields: { attempts: number; maxAttempts: number; leasedUntil: Date | null }
) =>
  authPool.query(
    'INSERT INTO job (id, kind, payload, "dedupeKey", "availableAt", "leaseOwner", "leasedUntil", attempts, "maxAttempts") VALUES ($1, $2, \'{}\'::json, $3, $4, $5, $6, $7, $8)',
    [
      id,
      "test.lease",
      `job-${id}`,
      new Date("1990-01-01T00:00:00Z"),
      fields.leasedUntil ? "worker-that-stopped" : null,
      fields.leasedUntil,
      fields.attempts,
      fields.maxAttempts,
    ]
  );

const readJob = async (id: string) => {
  const rows = await authPool.query<{
    attempts: number;
    completedAt: Date | null;
    deadAt: Date | null;
    lastError: string | null;
    leaseToken: string | null;
  }>(
    'SELECT attempts, "completedAt", "deadAt", "lastError", "leaseToken" FROM job WHERE id = $1',
    [id]
  );
  return rows.rows[0];
};

const processOne = (
  workerId: string,
  handle: JobHandlers["Service"]["handle"],
  leasePolicy: JobLeasePolicy = DEFAULT_JOB_LEASE_POLICY
) =>
  Effect.runPromise(
    Effect.provide(
      Effect.gen(function* processBatch() {
        const processor = yield* JobProcessor;
        return yield* processor.processBatch(workerId, 1);
      }),
      Layer.provide(
        makeJobProcessorLayer(leasePolicy),
        Layer.succeed(JobHandlers, JobHandlers.of({ handle }))
      )
    )
  );

it("dead-letters a job whose final attempt lost its lease instead of running it again", async () => {
  const id = randomUUID();
  let handled = false;
  await insertJob(id, {
    attempts: 3,
    leasedUntil: new Date(Date.now() - 120_000),
    maxAttempts: 3,
  });
  try {
    const result = await processOne(`lease-worker-${id}`, () => {
      handled = true;
      return Effect.void;
    });
    expect(result).toEqual({
      claimed: 0,
      completed: 0,
      deadLettered: 1,
      retried: 0,
    });
    expect(handled).toBe(false);
    const job = await readJob(id);
    expect(job).toMatchObject({
      attempts: 3,
      completedAt: null,
      lastError: EXHAUSTED_LEASE_ERROR,
    });
    expect(job?.deadAt).not.toBeNull();
  } finally {
    await authPool.query("DELETE FROM job WHERE id = $1", [id]);
  }
});

it("still runs a job whose lease expired with attempts left", async () => {
  const id = randomUUID();
  await insertJob(id, {
    attempts: 2,
    leasedUntil: new Date(Date.now() - 120_000),
    maxAttempts: 3,
  });
  try {
    const result = await processOne(`lease-worker-${id}`, () => Effect.void);
    expect(result).toMatchObject({ claimed: 1, completed: 1 });
    expect(await readJob(id)).toMatchObject({ attempts: 3 });
  } finally {
    await authPool.query("DELETE FROM job WHERE id = $1", [id]);
  }
});

it("interrupts the handler when its lease is taken over and records nothing", async () => {
  const id = randomUUID();
  const thiefToken = randomUUID();
  let finishedHandler = false;
  await insertJob(id, { attempts: 0, leasedUntil: null, maxAttempts: 3 });
  try {
    const result = await processOne(
      `lease-worker-${id}`,
      () =>
        Effect.gen(function* slowHandler() {
          // Another worker takes the job over while this handler runs.
          yield* Effect.promise(() =>
            authPool.query(
              'UPDATE job SET "leaseOwner" = \'thief\', "leaseToken" = $2 WHERE id = $1',
              [id, thiefToken]
            )
          );
          yield* Effect.sleep("3 seconds");
          finishedHandler = true;
        }),
      { leaseDurationMs: 60_000, renewalIntervalMs: 50 }
    );
    expect(finishedHandler).toBe(false);
    expect(result).toEqual({
      claimed: 1,
      completed: 0,
      deadLettered: 0,
      retried: 0,
    });
    expect(await readJob(id)).toMatchObject({
      completedAt: null,
      deadAt: null,
      leaseToken: thiefToken,
    });
  } finally {
    await authPool.query("DELETE FROM job WHERE id = $1", [id]);
  }
});

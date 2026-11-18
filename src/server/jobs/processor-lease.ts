import { and, or } from "@prisma/orm-postgres/orm-client";

import { db } from "@/src/prisma/db";

import type { ClaimedJob } from "./processor-contracts";

export const EXHAUSTED_LEASE_ERROR =
  "The job's lease expired after its final attempt.";

export interface ClaimResult {
  readonly jobs: readonly ClaimedJob[];
  // Jobs whose last attempt never reported back (crash or stall) and that
  // were dead-lettered instead of being run again.
  readonly deadLettered: number;
}

interface Candidate {
  readonly id: string;
  readonly attempts: number;
  readonly maxAttempts: number;
}

const claimable = (candidate: Candidate, at: Date) =>
  db.orm.public.Job.where((current) =>
    and(
      current.id.eq(candidate.id),
      current.attempts.eq(candidate.attempts),
      current.completedAt.isNull(),
      current.deadAt.isNull(),
      current.availableAt.lte(at),
      or(current.leasedUntil.isNull(), current.leasedUntil.lt(at))
    )
  );

// Every attempt is counted at claim, so a job that used its last attempt and
// is claimable again lost that attempt without reporting a failure. It dies
// here, under the same compare-and-set as a claim, instead of running again.
const deadLetterExhausted = async (candidate: Candidate): Promise<boolean> => {
  const now = new Date();
  const updated = await claimable(candidate, now).updateAndCount({
    deadAt: now,
    lastError: EXHAUSTED_LEASE_ERROR,
    leaseOwner: null,
    leasedUntil: null,
    updatedAt: now,
  });
  return updated > 0;
};

const claimOne = async (
  candidate: Candidate,
  workerId: string,
  leaseDurationMs: number
): Promise<ClaimedJob | null> => {
  const claimedAt = new Date();
  const leaseToken = crypto.randomUUID();
  const updated = await claimable(candidate, claimedAt).updateAndCount({
    attempts: candidate.attempts + 1,
    leaseOwner: workerId,
    leaseToken,
    leasedUntil: new Date(claimedAt.getTime() + leaseDurationMs),
    updatedAt: claimedAt,
  });
  if (updated === 0) {
    return null;
  }
  const claimedJob = await db.orm.public.Job.where({
    id: candidate.id,
    leaseToken,
  }).first();
  return claimedJob
    ? {
        attempts: claimedJob.attempts,
        id: claimedJob.id,
        kind: claimedJob.kind,
        leaseToken,
        maxAttempts: claimedJob.maxAttempts,
        payload: claimedJob.payload,
      }
    : null;
};

export const claimJobs = async (
  workerId: string,
  limit: number,
  leaseDurationMs: number
): Promise<ClaimResult> => {
  const now = new Date();
  const candidates = await db.orm.public.Job.where((job) =>
    and(
      job.completedAt.isNull(),
      job.deadAt.isNull(),
      job.availableAt.lte(now),
      or(job.leasedUntil.isNull(), job.leasedUntil.lt(now))
    )
  )
    .orderBy((job) => job.availableAt.asc())
    .limit(limit)
    .all();
  const outcomes = await Promise.all(
    candidates.map(async (candidate) => {
      if (candidate.attempts >= candidate.maxAttempts) {
        return (await deadLetterExhausted(candidate)) ? "dead" : null;
      }
      return claimOne(candidate, workerId, leaseDurationMs);
    })
  );
  return {
    deadLettered: outcomes.filter((outcome) => outcome === "dead").length,
    jobs: outcomes.filter(
      (outcome): outcome is ClaimedJob => outcome !== null && outcome !== "dead"
    ),
  };
};

export const renewJobLease = async (
  job: ClaimedJob,
  workerId: string,
  leaseDurationMs: number
): Promise<boolean> => {
  const now = new Date();
  const renewed = await db.orm.public.Job.where((current) =>
    and(
      current.completedAt.isNull(),
      current.id.eq(job.id),
      current.leaseOwner.eq(workerId),
      current.leaseToken.eq(job.leaseToken),
      current.leasedUntil.gt(now)
    )
  ).updateAndCount({
    leasedUntil: new Date(now.getTime() + leaseDurationMs),
    updatedAt: now,
  });
  return renewed > 0;
};

const heldLease = (job: ClaimedJob, workerId: string, now: Date) =>
  db.orm.public.Job.where((current) =>
    and(
      current.completedAt.isNull(),
      current.id.eq(job.id),
      current.leaseOwner.eq(workerId),
      current.leaseToken.eq(job.leaseToken),
      current.leasedUntil.gte(now)
    )
  );

export const finishJob = async (
  job: ClaimedJob,
  workerId: string
): Promise<boolean> => {
  const now = new Date();
  const finished = await heldLease(job, workerId, now).updateAndCount({
    completedAt: now,
    lastError: null,
    leaseOwner: null,
    leasedUntil: null,
    updatedAt: now,
  });
  return finished > 0;
};

export const retryJob = async (
  job: ClaimedJob,
  workerId: string,
  reason: string,
  permanent: boolean
): Promise<boolean> => {
  const isDead = permanent || job.attempts >= job.maxAttempts;
  const delaySeconds = Math.min(3600, 2 ** Math.min(job.attempts, 11));
  const now = new Date();
  const retried = await heldLease(job, workerId, now).updateAndCount({
    ...(isDead
      ? {}
      : { availableAt: new Date(now.getTime() + delaySeconds * 1000) }),
    deadAt: isDead ? now : null,
    lastError: reason,
    leaseOwner: null,
    leasedUntil: null,
    updatedAt: now,
  });
  return retried > 0;
};

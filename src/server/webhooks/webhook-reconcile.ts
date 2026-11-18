import { authPool } from "../auth/database";
import { WEBHOOK_DELIVERY_JOB } from "./webhook-contracts";

const ORPHAN_GRACE_MS = 86_400_000;
export const ORPHANED_DELIVERY_ERROR = "The delivery job was dead-lettered.";

/**
 * Closes deliveries that are still pending or retrying although no live job
 * will ever attempt them again (the job died after a crash, say). The job is
 * created in the same transaction as the delivery, so a day without any
 * change and without a live job means nothing is in flight. Returns how many
 * deliveries were marked dead.
 */
export const reconcileOrphanedDeliveries = async (
  now: Date
): Promise<number> => {
  const result = await authPool.query(
    `UPDATE "webhook_delivery" AS delivery
       SET "status" = 'dead', "lastError" = $1, "updatedAt" = $2
     WHERE delivery."status" IN ('pending', 'retrying')
       AND delivery."updatedAt" < $3
       AND NOT EXISTS (
         SELECT 1 FROM "job"
          WHERE "job"."kind" = $4
            AND "job"."payload"->>'deliveryId' = delivery."id"::text
            AND "job"."completedAt" IS NULL
            AND "job"."deadAt" IS NULL
       )`,
    [
      ORPHANED_DELIVERY_ERROR,
      now,
      new Date(now.getTime() - ORPHAN_GRACE_MS),
      WEBHOOK_DELIVERY_JOB,
    ]
  );
  return result.rowCount ?? 0;
};

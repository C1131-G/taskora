import { afterAll, beforeAll, expect, it } from "bun:test";
import { randomUUID } from "node:crypto";

import { Effect } from "effect";

import { authPool } from "../../src/server/auth/database";
import { purgeExpiredData } from "../../src/server/jobs/data-retention";
import { ORPHANED_DELIVERY_ERROR } from "../../src/server/webhooks/webhook-reconcile";

const DAY_MS = 86_400_000;
const now = new Date();
const daysAgo = (days: number): Date => new Date(now.getTime() - days * DAY_MS);
const endpointId = randomUUID();
const deliveries = {
  deadJob: randomUUID(),
  liveJob: randomUUID(),
  noJob: randomUUID(),
  recent: randomUUID(),
  succeeded: randomUUID(),
};
const jobIds: string[] = [];

const insertDelivery = (id: string, status: string, updatedAt: Date) =>
  authPool.query(
    'INSERT INTO webhook_delivery (id, "endpointId", "eventId", "eventType", payload, status, attempts, "createdAt", "updatedAt") VALUES ($1, $2, $3, \'task.created\', \'{}\'::json, $4, 3, $5, $5)',
    [id, endpointId, randomUUID(), status, updatedAt]
  );

const insertJob = async (deliveryId: string, deadAt: Date | null) => {
  const id = randomUUID();
  jobIds.push(id);
  await authPool.query(
    'INSERT INTO job (id, kind, payload, "dedupeKey", "availableAt", "deadAt", attempts, "maxAttempts") VALUES ($1, \'webhooks.deliver\', $2::json, $3, $4, $5, 6, 6)',
    [
      id,
      JSON.stringify({ deliveryId }),
      `reconcile-${id}`,
      // Far in the future so no worker in another test claims it.
      new Date(now.getTime() + 365 * DAY_MS),
      deadAt,
    ]
  );
};

beforeAll(async () => {
  await authPool.query(
    "INSERT INTO webhook_endpoint (id, name, kind, url, events, \"createdById\") VALUES ($1, 'Reconcile', 'generic', 'https://example.com/hook', '{task.created}', $2)",
    [endpointId, randomUUID()]
  );
  await insertDelivery(deliveries.deadJob, "retrying", daysAgo(3));
  await insertJob(deliveries.deadJob, daysAgo(3));
  await insertDelivery(deliveries.noJob, "pending", daysAgo(3));
  await insertDelivery(deliveries.liveJob, "retrying", daysAgo(3));
  await insertJob(deliveries.liveJob, null);
  await insertDelivery(deliveries.recent, "retrying", now);
  await insertDelivery(deliveries.succeeded, "succeeded", daysAgo(3));
});

afterAll(async () => {
  await authPool.query("DELETE FROM job WHERE id = ANY($1::uuid[])", [jobIds]);
  await authPool.query("DELETE FROM webhook_endpoint WHERE id = $1", [
    endpointId,
  ]);
});

const statuses = async () => {
  const rows = await authPool.query<{
    id: string;
    status: string;
    lastError: string | null;
  }>(
    'SELECT id, status, "lastError" FROM webhook_delivery WHERE "endpointId" = $1',
    [endpointId]
  );
  return new Map(rows.rows.map((row) => [row.id, row]));
};

it("closes open deliveries whose job is gone and leaves live work alone", async () => {
  await Effect.runPromise(purgeExpiredData({ now }));
  const after = await statuses();
  expect(after.get(deliveries.deadJob)).toMatchObject({
    lastError: ORPHANED_DELIVERY_ERROR,
    status: "dead",
  });
  expect(after.get(deliveries.noJob)?.status).toBe("dead");
  expect(after.get(deliveries.liveJob)?.status).toBe("retrying");
  expect(after.get(deliveries.recent)?.status).toBe("retrying");
  expect(after.get(deliveries.succeeded)?.status).toBe("succeeded");
});

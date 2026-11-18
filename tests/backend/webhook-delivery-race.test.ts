import { afterAll, beforeAll, expect, it } from "bun:test";
import { randomUUID } from "node:crypto";

import { Effect } from "effect";

import { db } from "../../src/prisma/db";
import { authPool } from "../../src/server/auth/database";
import { deliverWebhook } from "../../src/server/webhooks/webhook-delivery";
import type { DeliveryDeps } from "../../src/server/webhooks/webhook-delivery";
import { enqueueWebhookEvent } from "../../src/server/webhooks/webhook-enqueue";
import {
  WebhookManagement,
  WebhookManagementLive,
} from "../../src/server/webhooks/webhook-management";
import { webhookKeyMaterial } from "../../src/server/webhooks/webhook-secret";

process.env["BETTER_AUTH_SECRET"] ??=
  "test-only-secret-that-is-at-least-thirty-two-characters";

const domain = "webhook-delivery-race.example";
const adminId = randomUUID();

const manage = <Value>(
  program: (
    service: WebhookManagement["Service"]
  ) => Effect.Effect<Value, unknown>
) =>
  Effect.runPromise(
    Effect.result(
      Effect.provide(
        Effect.gen(function* use() {
          return yield* program(yield* WebhookManagement);
        }),
        WebhookManagementLive
      )
    )
  );

beforeAll(async () => {
  await authPool.query(
    'INSERT INTO "user" (id, name, email, "emailNormalized", role, "mustChangePassword") VALUES ($1, $2, $3, $3, $4, false)',
    [adminId, "Webhook Race Admin", `${adminId}@${domain}`, "admin"]
  );
});

afterAll(async () => {
  await authPool.query(
    'DELETE FROM webhook_endpoint WHERE "createdById" = $1',
    [adminId]
  );
  await authPool.query('DELETE FROM activity WHERE "actorId" = $1', [adminId]);
  await authPool.query("DELETE FROM job WHERE kind = 'webhooks.deliver'");
  await authPool.query('DELETE FROM "user" WHERE id = $1', [adminId]);
});

// The post call waits for `release` so a test can act while it is in flight.
const gatedDeps = (status: number) => {
  const gate = Promise.withResolvers<boolean>();
  const started = Promise.withResolvers<boolean>();
  const posts: string[] = [];
  const deps: DeliveryDeps = {
    keyMaterial: webhookKeyMaterial(),
    now: () => new Date(),
    post: async (request) => {
      posts.push(request.body);
      started.resolve(true);
      await gate.promise;
      return { bodySnippet: "", status };
    },
    production: true,
    resolve: () => Promise.resolve([{ address: "93.184.216.34", family: 4 }]),
  };
  return {
    deps,
    inFlight: started.promise,
    posts,
    release: () => gate.resolve(true),
  };
};

const setUpDelivery = async (): Promise<string> => {
  const created = await manage((service) =>
    service.create(adminId, {
      events: ["task.created"],
      kind: "generic",
      name: "Race receiver",
      url: "https://receiver.example.com/in",
    })
  );
  if (created._tag !== "Success") {
    throw new Error("The endpoint could not be created.");
  }
  const endpointId = created.success.endpoint.id;
  await db.transaction((transaction) =>
    enqueueWebhookEvent(transaction, "task.created", {
      data: { id: "task-1", status: "todo", title: "Race" },
      eventId: randomUUID(),
      now: new Date(),
    })
  );
  const rows = await authPool.query<{ id: string }>(
    'SELECT id FROM webhook_delivery WHERE "endpointId" = $1',
    [endpointId]
  );
  const [row] = rows.rows;
  if (!row) {
    throw new Error("No delivery was queued.");
  }
  return row.id;
};

const readDelivery = async (id: string) => {
  const rows = await authPool.query<{ status: string; attempts: number }>(
    "SELECT status, attempts FROM webhook_delivery WHERE id = $1",
    [id]
  );
  return rows.rows[0];
};

const deliver = (id: string, deps: DeliveryDeps) =>
  Effect.runPromise(Effect.result(deliverWebhook(id, deps)));

it("never lets a stale failing attempt overwrite a delivery that succeeded", async () => {
  const id = await setUpDelivery();
  const { deps, inFlight, release } = gatedDeps(503);
  const stale = deliver(id, deps);
  await inFlight;
  // A newer run claimed attempt 2 and succeeded while this one was waiting.
  await authPool.query(
    "UPDATE webhook_delivery SET attempts = 2, status = 'succeeded' WHERE id = $1",
    [id]
  );
  release();
  const outcome = await stale;
  expect(outcome._tag).toBe("Success");
  expect(await readDelivery(id)).toEqual({ attempts: 2, status: "succeeded" });
});

it("refuses to redeliver while the delivery is in flight and allows it once finished", async () => {
  const id = await setUpDelivery();
  const refused = await manage((service) => service.redeliver(adminId, id));
  expect(refused._tag).toBe("Failure");
  if (refused._tag === "Failure") {
    expect(refused.failure).toMatchObject({ code: "CONFLICT" });
  }
  expect(await readDelivery(id)).toEqual({ attempts: 0, status: "pending" });

  await authPool.query(
    "UPDATE webhook_delivery SET status = 'dead', attempts = 6 WHERE id = $1",
    [id]
  );
  const accepted = await manage((service) => service.redeliver(adminId, id));
  expect(accepted._tag).toBe("Success");
  expect(await readDelivery(id)).toEqual({ attempts: 0, status: "pending" });
});

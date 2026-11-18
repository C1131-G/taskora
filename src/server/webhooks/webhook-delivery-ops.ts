import { randomUUID } from "node:crypto";

import { and } from "@prisma/orm-postgres/orm-client";

import { db } from "@/src/prisma/db";

import { AppError } from "../core/action-result";
import { REDELIVERABLE_STATUSES } from "./webhook-contracts";
import type { WebhookDeliverySummary } from "./webhook-contracts";
import { queueDeliveryJob } from "./webhook-enqueue";
import { notFound, requireAdmin, toDeliverySummary } from "./webhook-internal";

const MAX_DELIVERY_PAGE = 100;

export const listEndpointDeliveries = async (
  actorId: string,
  endpointId: string,
  limit: number
): Promise<readonly WebhookDeliverySummary[]> => {
  await requireAdmin(actorId);
  const rows = await db.orm.public.WebhookDelivery.where({ endpointId })
    .orderBy((delivery) => delivery.createdAt.desc())
    .limit(Math.max(1, Math.min(MAX_DELIVERY_PAGE, Math.trunc(limit))))
    .all();
  return rows.map(toDeliverySummary);
};

/**
 * Resets one finished (succeeded or dead) delivery to pending and queues it
 * again under a fresh job key. A delivery still in flight is refused, so two
 * jobs never post it at the same time.
 */
export const redeliver = async (
  actorId: string,
  deliveryId: string
): Promise<WebhookDeliverySummary> => {
  await requireAdmin(actorId);
  return db.transaction(async (transaction) => {
    const now = new Date();
    const reset = await transaction.orm.public.WebhookDelivery.where(
      (delivery) =>
        and(
          delivery.id.eq(deliveryId),
          delivery.status.in(REDELIVERABLE_STATUSES)
        )
    ).update({
      attempts: 0,
      deliveredAt: null,
      lastError: null,
      responseBody: null,
      responseCode: null,
      status: "pending",
      updatedAt: now,
    });
    if (!reset) {
      const exists = await transaction.orm.public.WebhookDelivery.where({
        id: deliveryId,
      })
        .select("id")
        .first();
      throw exists
        ? new AppError({
            code: "CONFLICT",
            message: "The delivery is still in progress.",
          })
        : notFound();
    }
    await queueDeliveryJob(transaction, {
      dedupeKey: `webhook:${reset.endpointId}:${reset.eventId}:redeliver:${randomUUID()}`,
      deliveryId,
      now,
    });
    return toDeliverySummary(reset);
  });
};

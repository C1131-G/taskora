import { afterAll, beforeAll, expect, it } from "bun:test";
import { randomUUID } from "node:crypto";

import { db } from "../../src/prisma/db";
import { authPool } from "../../src/server/auth/database";
import { recordDeliveryReceipt } from "../../src/server/email/email-internal";

process.env["BETTER_AUTH_SECRET"] ??=
  "test-only-secret-that-is-at-least-thirty-two-characters";

const userId = randomUUID();

beforeAll(async () => {
  await authPool.query(
    'INSERT INTO "user" (id, name, email, "emailNormalized", role, "mustChangePassword") VALUES ($1, $2, $3, $3, \'employee\', false)',
    [userId, "Digest cursor", `${userId}@email-digest-cursor.example`]
  );
  await authPool.query(
    'INSERT INTO email_setting ("userId", digest) VALUES ($1, true)',
    [userId]
  );
});

afterAll(async () => {
  await authPool.query('DELETE FROM email_delivery WHERE "userId" = $1', [
    userId,
  ]);
  await authPool.query('DELETE FROM "user" WHERE id = $1', [userId]);
});

const receipts = async (dedupeKey: string) => {
  const rows = await authPool.query(
    'SELECT id FROM email_delivery WHERE "dedupeKey" = $1',
    [dedupeKey]
  );
  return rows.rowCount;
};

const cursor = async () => {
  const rows = await authPool.query<{ lastDigestAt: Date | null }>(
    'SELECT "lastDigestAt" FROM email_setting WHERE "userId" = $1',
    [userId]
  );
  return rows.rows[0]?.lastDigestAt ?? null;
};

const recordWithCursor = (dedupeKey: string, at: Date, fail: boolean) =>
  db.transaction(async () => {
    await recordDeliveryReceipt(userId, dedupeKey);
    await db.orm.public.EmailSetting.where({ userId }).update({
      lastDigestAt: at,
      updatedAt: at,
    });
    if (fail) {
      throw new Error("crash after the receipt");
    }
  });

it("rolls the receipt back with the cursor when the digest write fails", async () => {
  const dedupeKey = `digest:${userId}:2099-01-01`;
  await expect(
    recordWithCursor(dedupeKey, new Date("2099-01-01T08:00:00Z"), true)
  ).rejects.toThrow("crash after the receipt");
  expect(await receipts(dedupeKey)).toBe(0);
  expect(await cursor()).toBeNull();
});

it("moves the cursor even when a concurrent run already wrote the receipt", async () => {
  const dedupeKey = `digest:${userId}:2099-01-02`;
  await recordDeliveryReceipt(userId, dedupeKey);
  const at = new Date("2099-01-02T08:00:00Z");
  await recordWithCursor(dedupeKey, at, false);
  expect(await receipts(dedupeKey)).toBe(1);
  const moved = await cursor();
  expect(moved?.toISOString()).toBe(at.toISOString());
});

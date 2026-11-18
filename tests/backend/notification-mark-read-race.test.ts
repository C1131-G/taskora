import { expect, it, mock } from "bun:test";
import { randomUUID } from "node:crypto";

import { Effect, Exit } from "effect";

import { authPool } from "../../src/server/auth/database";

process.env["BETTER_AUTH_SECRET"] ??=
  "test-only-secret-that-is-at-least-thirty-two-characters";

// Counts the inbox signals markRead raises.
const queued: unknown[] = [];
mock.module("../../src/server/realtime/publisher", () => ({
  queueRealtimeEvents: (events: readonly unknown[]) => {
    queued.push(...events);
  },
  withRealtimeOutbox: <Result>(run: () => Promise<Result>) => run(),
}));

const { Notifications, NotificationsLive } =
  await import("../../src/server/notifications/service");

const markRead = (userId: string, notificationId: string) =>
  Effect.runPromiseExit(
    Effect.provide(
      Effect.gen(function* mark() {
        const notifications = yield* Notifications;
        yield* notifications.markRead(userId, notificationId);
      }),
      NotificationsLive
    )
  );

const readAtOf = async (notificationId: string): Promise<Date | null> => {
  const result = await authPool.query<{ readAt: Date | null }>(
    'SELECT "readAt" FROM notification WHERE id = $1',
    [notificationId]
  );
  return result.rows[0]?.readAt ?? null;
};

it("marks a notification read once, however many calls race or repeat", async () => {
  const userId = randomUUID();
  const otherId = randomUUID();
  const notificationId = randomUUID();
  for (const id of [userId, otherId]) {
    // eslint-disable-next-line no-await-in-loop
    await authPool.query(
      'INSERT INTO "user" (id, name, email, "emailNormalized", role, "mustChangePassword") VALUES ($1, $2, $3, $3, \'employee\', false)',
      [id, "Reader", `${id}@mark-read-race.example`]
    );
  }
  await authPool.query(
    'INSERT INTO notification (id, "userId", type, text) VALUES ($1, $2, $3, $4)',
    [notificationId, userId, "mention", "A colleague mentioned you"]
  );

  try {
    queued.length = 0;
    const results = await Promise.all([
      markRead(userId, notificationId),
      markRead(userId, notificationId),
      markRead(userId, notificationId),
    ]);
    expect(results.every((exit) => Exit.isSuccess(exit))).toBe(true);
    expect(queued).toEqual([{ kind: "inbox", userId }]);
    const firstReadAt = await readAtOf(notificationId);
    expect(firstReadAt).not.toBeNull();

    // A replay later keeps the first read time and signals nothing.
    const replay = await markRead(userId, notificationId);
    expect(Exit.isSuccess(replay)).toBe(true);
    expect(await readAtOf(notificationId)).toEqual(firstReadAt);
    expect(queued).toHaveLength(1);

    // Someone else's notification stays hidden and unread.
    await authPool.query(
      'UPDATE notification SET "readAt" = NULL WHERE id = $1',
      [notificationId]
    );
    const foreign = await markRead(otherId, notificationId);
    expect(Exit.isFailure(foreign) ? String(foreign.cause) : "").toContain(
      "The notification was not found."
    );
    expect(await readAtOf(notificationId)).toBeNull();
  } finally {
    await authPool.query('DELETE FROM notification WHERE "userId" = $1', [
      userId,
    ]);
    await authPool.query('DELETE FROM "user" WHERE id = ANY($1)', [
      [userId, otherId],
    ]);
  }
});

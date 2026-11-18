import { expect, it } from "bun:test";

import { Effect } from "effect";

import { authPool } from "../../src/server/auth/database";
import { Uploads } from "../../src/server/storage/uploads-contracts";
import {
  removeUploadFixture,
  runUploads,
  seedUploadFixture,
} from "./support/upload-state-fixtures";

const requestAvatar = async (actorId: string) => {
  const ticket = await runUploads(
    Effect.gen(function* request() {
      const uploads = yield* Uploads;
      return yield* uploads.requestAvatarUpload(actorId, {
        contentType: "image/png",
        sizeBytes: 1024,
      });
    })
  );
  if (!ticket.ok) {
    throw new Error(ticket.error.message);
  }
  return ticket.data.uploadIntentId;
};

const finalizeAvatar = (actorId: string, intentId: string) =>
  runUploads(
    Effect.gen(function* finalize() {
      const uploads = yield* Uploads;
      return yield* uploads.finalizeAvatarUpload(actorId, intentId);
    })
  );

const intentStates = async (actorId: string) => {
  const rows = await authPool.query(
    'SELECT id, state, "objectKey" FROM upload_intent WHERE "ownerId" = $1',
    [actorId]
  );
  return new Map(
    rows.rows.map((row) => [
      String(row.id),
      { key: String(row.objectKey), state: String(row.state) },
    ])
  );
};

const avatarDeletes = async (actorId: string) => {
  const rows = await authPool.query(
    "SELECT payload->>'objectKey' AS key, \"dedupeKey\" FROM job WHERE kind = 'storage.delete-avatar' AND payload->>'objectKey' LIKE $1",
    [`company/avatars/${actorId}/%`]
  );
  return rows.rows.map((row) => ({
    dedupeKey: String(row.dedupeKey),
    key: String(row.key),
  }));
};

const userImage = async (actorId: string) => {
  const rows = await authPool.query('SELECT image FROM "user" WHERE id = $1', [
    actorId,
  ]);
  return String(rows.rows[0]?.image);
};

it("retires the replaced avatar's intent and queues one delete for its object, and a replayed finalize changes nothing", async () => {
  const fixture = await seedUploadFixture();
  const { actorId } = fixture;
  try {
    const first = await requestAvatar(actorId);
    const firstResult = await finalizeAvatar(actorId, first);
    const second = await requestAvatar(actorId);
    const secondResult = await finalizeAvatar(actorId, second);
    const replay = await finalizeAvatar(actorId, second);

    const states = await intentStates(actorId);
    const firstKey = states.get(first)?.key;
    expect([firstResult.ok, secondResult.ok, replay.ok]).toEqual([
      true,
      true,
      true,
    ]);
    expect(states.get(first)?.state).toBe("removed");
    expect(states.get(second)?.state).toBe("finalized");
    expect(await userImage(actorId)).toBe(states.get(second)?.key ?? "");
    expect(await avatarDeletes(actorId)).toEqual([
      { dedupeKey: `storage.delete-avatar:${firstKey}`, key: firstKey ?? "" },
    ]);
  } finally {
    await removeUploadFixture(fixture);
  }
});

it("serializes two concurrent avatar finalizes so the losing avatar's object is also deleted", async () => {
  const fixture = await seedUploadFixture();
  const { actorId } = fixture;
  try {
    const original = await requestAvatar(actorId);
    const originalResult = await finalizeAvatar(actorId, original);
    expect(originalResult.ok).toBe(true);
    const [left, right] = await Promise.all([
      requestAvatar(actorId),
      requestAvatar(actorId),
    ]);

    const results = await Promise.all([
      finalizeAvatar(actorId, left),
      finalizeAvatar(actorId, right),
    ]);

    const states = await intentStates(actorId);
    const image = await userImage(actorId);
    const winner = states.get(left)?.key === image ? left : right;
    const loser = winner === left ? right : left;
    expect(results.every((result) => result.ok)).toBe(true);
    expect([states.get(left)?.key, states.get(right)?.key]).toContain(image);
    expect(states.get(winner)?.state).toBe("finalized");
    expect(states.get(loser)?.state).toBe("removed");
    expect(states.get(original)?.state).toBe("removed");
    const deletes = await avatarDeletes(actorId);
    const deleted = deletes.map(({ key }) => key).toSorted();
    expect(deleted).toEqual(
      [states.get(original)?.key ?? "", states.get(loser)?.key ?? ""].toSorted()
    );
  } finally {
    await removeUploadFixture(fixture);
  }
});

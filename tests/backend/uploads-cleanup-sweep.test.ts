import { expect, it } from "bun:test";
import { randomUUID } from "node:crypto";

import { Effect } from "effect";

import { authPool } from "../../src/server/auth/database";
import { AppError } from "../../src/server/core/action-result";
import { Uploads } from "../../src/server/storage/uploads-contracts";
import {
  fakeStorage,
  removeUploadFixture,
  runUploads,
  seedUploadFixture,
} from "./support/upload-state-fixtures";

const OLD = new Date("2020-01-01T00:00:00.000Z");

it("keeps cleaning after an object delete fails, and sweeps orphaned avatars, logos and intake objects", async () => {
  const fixture = await seedUploadFixture();
  const { actorId } = fixture;
  const failingIntentId = randomUUID();
  const failingKey = `company/tasks/${randomUUID()}/${failingIntentId}`;
  const liveAvatar = `company/avatars/${actorId}/${randomUUID()}`;
  const orphans = [
    `company/avatars/${actorId}/${randomUUID()}`,
    `company/client-logos/${randomUUID()}/${randomUUID()}`,
    `company/intake/${randomUUID()}/${randomUUID()}`,
  ];
  const recentOrphan = `company/intake/${randomUUID()}/${randomUUID()}`;
  const deleted: string[] = [];
  await authPool.query('UPDATE "user" SET image = $2 WHERE id = $1', [
    actorId,
    liveAvatar,
  ]);
  await authPool.query(
    `INSERT INTO upload_intent (id, "ownerId", "objectKey", "fileName", "contentType", "sizeBytes", state, "expiresAt")
     VALUES ($1, $2, $3, 'expired.pdf', 'application/pdf', 20, 'pending', now() - interval '1 hour')`,
    [failingIntentId, actorId, failingKey]
  );
  const listing: Record<string, readonly string[]> = {
    "company/avatars/": [liveAvatar, orphans[0] ?? ""],
    "company/client-logos/": [orphans[1] ?? ""],
    "company/intake/": [orphans[2] ?? "", recentOrphan],
  };
  const storage = fakeStorage({
    deleteObject: (key) => {
      if (key === failingKey) {
        return Effect.fail(
          new AppError({ code: "UNAVAILABLE", message: "Storage is down." })
        );
      }
      deleted.push(key);
      return Effect.void;
    },
    listObjects: (prefix) =>
      Effect.succeed(
        (listing[prefix] ?? []).map((key) => ({
          key,
          lastModified: key === recentOrphan ? new Date() : OLD,
        }))
      ),
  });
  try {
    const result = await runUploads(
      Effect.gen(function* cleanup() {
        const uploads = yield* Uploads;
        return yield* uploads.cleanupExpiredUploads();
      }),
      storage
    );

    const intent = await authPool.query(
      "SELECT state FROM upload_intent WHERE id = $1",
      [failingIntentId]
    );
    expect(result.ok).toBe(true);
    expect(intent.rows[0]?.state).toBe("removed");
    expect(deleted).toEqual(expect.arrayContaining(orphans));
    expect(deleted).not.toContain(liveAvatar);
    expect(deleted).not.toContain(recentOrphan);
  } finally {
    await removeUploadFixture(fixture);
  }
});

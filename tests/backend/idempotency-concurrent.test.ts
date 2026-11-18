import { afterAll, beforeAll, expect, it } from "bun:test";
import { randomUUID } from "node:crypto";

import { Effect } from "effect";

import { authPool } from "../../src/server/auth/database";
import {
  CountResultSchema,
  Idempotency,
  IdempotencyLive,
} from "../../src/server/core/idempotency";

process.env["BETTER_AUTH_SECRET"] ??=
  "test-only-secret-that-is-at-least-thirty-two-characters";

const actorId = randomUUID();

beforeAll(async () => {
  await authPool.query(
    'INSERT INTO "user" (id, name, email, "emailNormalized", role, "mustChangePassword") VALUES ($1, $2, $3, $3, \'employee\', false)',
    [actorId, "Concurrent key", `${actorId}@idempotency-concurrent.example`]
  );
});

afterAll(async () => {
  await authPool.query('DELETE FROM idempotency_key WHERE "actorId" = $1', [
    actorId,
  ]);
  await authPool.query('DELETE FROM "user" WHERE id = $1', [actorId]);
});

const runWithKey = (
  key: string,
  input: unknown,
  execute: () => Effect.Effect<{ readonly count: number }>
) =>
  Effect.runPromise(
    Effect.result(
      Effect.provide(
        Effect.gen(function* run() {
          const idempotency = yield* Idempotency;
          return yield* idempotency.run({
            actorId,
            execute,
            input,
            key,
            operation: "test.concurrent",
            resultSchema: CountResultSchema,
          });
        }),
        IdempotencyLive
      )
    )
  );

it("replays the stored result to a retry that raced the original request", async () => {
  const key = `concurrent-${randomUUID()}`;
  let executions = 0;
  const execute = () =>
    Effect.gen(function* slowWrite() {
      executions += 1;
      const count = executions;
      yield* Effect.sleep("300 millis");
      return { count };
    });
  const first = runWithKey(key, { title: "same" }, execute);
  // The retry arrives while the original transaction is still open.
  await Bun.sleep(100);
  const second = runWithKey(key, { title: "same" }, execute);
  const [original, retry] = await Promise.all([first, second]);
  expect(executions).toBe(1);
  expect(original).toMatchObject({ _tag: "Success", success: { count: 1 } });
  expect(retry).toMatchObject({ _tag: "Success", success: { count: 1 } });
});

const slowCountOfOne = () =>
  Effect.sleep("300 millis").pipe(Effect.as({ count: 1 }));

it("still refuses a racing request that reuses the key for different input", async () => {
  const key = `concurrent-${randomUUID()}`;
  const first = runWithKey(key, { title: "one" }, slowCountOfOne);
  await Bun.sleep(100);
  const second = runWithKey(key, { title: "two" }, slowCountOfOne);
  const [original, other] = await Promise.all([first, second]);
  expect(original._tag).toBe("Success");
  expect(other).toMatchObject({
    _tag: "Failure",
    failure: {
      code: "CONFLICT",
      message: "This idempotency key was used for a different request.",
    },
  });
});

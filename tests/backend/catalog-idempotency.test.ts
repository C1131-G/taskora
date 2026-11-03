import { expect, it } from "bun:test";
import { randomUUID } from "node:crypto";

import { Effect, Layer } from "effect";

import "./support/next-cache-mock";
import { authPool } from "../../src/server/auth/database";
import {
  Idempotency,
  IdempotencyLive,
} from "../../src/server/core/idempotency";
import {
  TeamManagement,
  TeamManagementLive,
  TeamSummarySchema,
} from "../../src/server/people/team-management";
import {
  LabelManagement,
  LabelManagementLive,
  LabelSummarySchema,
} from "../../src/server/tasks/label-management";

process.env["BETTER_AUTH_SECRET"] ??=
  "test-only-secret-that-is-at-least-thirty-two-characters";

const layers = Layer.mergeAll(
  IdempotencyLive,
  TeamManagementLive,
  LabelManagementLive
);

const seedUser = async (userId: string, role: "admin" | "employee") => {
  await authPool.query(
    'INSERT INTO "user" (id, name, email, "emailNormalized", role, "mustChangePassword") VALUES ($1, $2, $3, $3, $4, false)',
    [userId, `Catalog ${role}`, `${userId}@catalog-idem.example`, role]
  );
};

const removeUser = async (userId: string) => {
  await authPool.query('DELETE FROM idempotency_key WHERE "actorId" = $1', [
    userId,
  ]);
  await authPool.query('DELETE FROM activity WHERE "actorId" = $1', [userId]);
  await authPool.query('DELETE FROM "user" WHERE id = $1', [userId]);
};

it("replays team and label creates without duplicating rows", async () => {
  const adminId = randomUUID();
  const employeeId = randomUUID();
  const suffix = randomUUID().slice(0, 8);
  await seedUser(adminId, "admin");
  await seedUser(employeeId, "employee");
  const teamName = `Team ${suffix}`;
  const labelName = `label-${suffix}`;

  try {
    const result = await Effect.runPromise(
      Effect.provide(
        Effect.gen(function* createCatalogRecords() {
          const idempotency = yield* Idempotency;
          const teams = yield* TeamManagement;
          const labels = yield* LabelManagement;

          const teamInput = {
            color: "#2563eb",
            description: null,
            name: teamName,
          };
          const createTeam = () =>
            idempotency.run({
              actorId: adminId,
              execute: () => teams.createTeam(adminId, teamInput),
              input: teamInput,
              key: `team-create-${suffix}`,
              operation: "team.create",
              resultSchema: TeamSummarySchema,
            });
          const team = yield* createTeam();
          const teamReplay = yield* createTeam();

          const labelInput = { color: "#16a34a", name: labelName };
          const createLabel = () =>
            idempotency.run({
              actorId: adminId,
              execute: () => labels.create(adminId, labelInput),
              input: labelInput,
              key: `label-create-${suffix}`,
              operation: "label.create",
              resultSchema: LabelSummarySchema,
            });
          const label = yield* createLabel();
          const labelReplay = yield* createLabel();

          return { label, labelReplay, team, teamReplay };
        }),
        layers
      )
    );

    expect(result.teamReplay.id).toBe(result.team.id);
    expect(result.labelReplay.id).toBe(result.label.id);

    const teamRows = await authPool.query(
      "SELECT id FROM team WHERE name = $1",
      [teamName]
    );
    expect(teamRows.rows).toHaveLength(1);
    const labelRows = await authPool.query(
      "SELECT id FROM label WHERE name = $1",
      [labelName]
    );
    expect(labelRows.rows).toHaveLength(1);
  } finally {
    await authPool.query("DELETE FROM label WHERE name = $1", [labelName]);
    await authPool.query("DELETE FROM team WHERE name = $1", [teamName]);
    await removeUser(employeeId);
    await removeUser(adminId);
  }
});

#!/usr/bin/env -S node
import type { Contract as Start } from '../../snapshots/af6ecd66fd2aaddd35dc4c9a0a33ff8ba394c2d30cf839494cb61c02f471c2a4/contract';
import startContract from '../../snapshots/af6ecd66fd2aaddd35dc4c9a0a33ff8ba394c2d30cf839494cb61c02f471c2a4/contract.json' with { type: 'json' };
import type { Contract as End } from '../../snapshots/e4dc20acb298e9934090c81403a317ddeb57735bdd626142b9a55e0984cf10bb/contract';
import endContract from '../../snapshots/e4dc20acb298e9934090c81403a317ddeb57735bdd626142b9a55e0984cf10bb/contract.json' with { type: 'json' };
import { Migration, MigrationCLI, col, rawSql } from '@prisma/orm-postgres/migration';

// A bug closed inside the workflow (a passed post-release check) never wrote a
// resolution; the owner chose to record those as fixed. An upload intent can no
// longer be "failed": one that is left behind is removed.
const backfillRows = rawSql({
  id: 'data.rule_decisions.backfillRows',
  label: 'Mark internally closed bugs as fixed and retire failed upload intents',
  operationClass: 'data',
  target: { id: 'postgres' },
  precheck: [],
  execute: [
    {
      description: 'closed bugs without a resolution were closed by a passed post-release check',
      sql: `UPDATE "public"."bug_report" SET "resolution" = 'fixed' WHERE "status" = 'closed' AND "resolution" IS NULL`,
    },
    {
      description: 'failed upload intents become removed',
      sql: `UPDATE "public"."upload_intent" SET "state" = 'removed' WHERE "state" = 'failed'`,
    },
  ],
  postcheck: [
    {
      description: 'every closed bug has a resolution',
      sql: `SELECT NOT EXISTS (SELECT 1 FROM "public"."bug_report" WHERE "status" = 'closed' AND "resolution" IS NULL) AS "result"`,
    },
    {
      description: 'no upload intent is failed',
      sql: `SELECT NOT EXISTS (SELECT 1 FROM "public"."upload_intent" WHERE "state" = 'failed') AS "result"`,
    },
  ],
});

export default class M extends Migration<Start, End> {
  override readonly startContractJson = startContract;
  override readonly endContractJson = endContract;

  override get operations() {
    return [
      this.dropCheckConstraint({
        schema: 'public',
        table: 'bug_report',
        constraint: 'bug_report_resolution_closed_dba429df',
      }),
      this.dropCheckConstraint({
        schema: 'public',
        table: 'upload_intent',
        constraint: 'upload_state_valid_f79005c7',
      }),
      backfillRows,
      this.addColumn({
        schema: 'public',
        table: 'session',
        column: col('lastActiveAt', 'timestamptz', {
          codecRef: { codecId: 'pg/timestamptz-date@1' },
        }),
      }),
      this.addColumn({
        schema: 'public',
        table: 'user',
        column: col('lastFailedLoginAt', 'timestamptz', {
          codecRef: { codecId: 'pg/timestamptz-date@1' },
        }),
      }),
      this.addCheckConstraint({
        schema: 'public',
        table: 'bug_report',
        constraint: 'bug_report_resolution_closed_b8d5a64c',
        expression: `("status" = 'closed') = ("resolution" IS NOT NULL)`,
      }),
      this.addCheckConstraint({
        schema: 'public',
        table: 'upload_intent',
        constraint: 'upload_state_valid_7792647d',
        expression: "state IN ('pending', 'finalized', 'removed')",
      }),
    ];
  }
}

MigrationCLI.run(import.meta.url, M);

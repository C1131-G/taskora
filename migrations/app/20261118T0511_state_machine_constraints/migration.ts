#!/usr/bin/env -S node
import type { Contract as End } from '../../snapshots/af6ecd66fd2aaddd35dc4c9a0a33ff8ba394c2d30cf839494cb61c02f471c2a4/contract';
import endContract from '../../snapshots/af6ecd66fd2aaddd35dc4c9a0a33ff8ba394c2d30cf839494cb61c02f471c2a4/contract.json' with { type: 'json' };
import type { Contract as Start } from '../../snapshots/f001ece94fea7f773796b8e6b6efc71a8b9c28c74c14e431761920fd58b2063a/contract';
import startContract from '../../snapshots/f001ece94fea7f773796b8e6b6efc71a8b9c28c74c14e431761920fd58b2063a/contract.json' with { type: 'json' };
import { Migration, MigrationCLI, rawSql } from '@prisma/orm-postgres/migration';

// The application now keeps each of these rules in one writer (see the state
// machine audit). This stops the migration with a clear message when an old
// row breaks a rule, instead of failing inside the constraint. A row that
// fails here needs a decision before it can be mapped to a valid state.
const checkExistingRows = rawSql({
  id: 'data.state_machine_constraints.checkExistingRows',
  label: 'Check that no existing row breaks the new state constraints',
  operationClass: 'data',
  target: { id: 'postgres' },
  precheck: [
    {
      description: 'no automation run has an outcome outside matched, skipped and failed',
      sql: `SELECT NOT EXISTS (SELECT 1 FROM "public"."automation_run" WHERE "outcome" NOT IN ('matched', 'skipped', 'failed')) AS "result"`,
    },
    {
      description: 'no bug has needsInfoSince or statusBeforeNeedsInfo outside needs_info, or misses them inside it',
      sql: `SELECT NOT EXISTS (SELECT 1 FROM "public"."bug_report" WHERE ("status" = 'needs_info') <> ("needsInfoSince" IS NOT NULL) OR ("status" = 'needs_info') <> ("statusBeforeNeedsInfo" IS NOT NULL)) AS "result"`,
    },
    {
      description: 'no bug saved a status before needs_info that cannot ask the client',
      sql: `SELECT NOT EXISTS (SELECT 1 FROM "public"."bug_report" WHERE "statusBeforeNeedsInfo" IS NOT NULL AND "statusBeforeNeedsInfo" NOT IN ('triaged', 'in_progress', 'in_verification')) AS "result"`,
    },
    {
      description: 'no bug has awaitingClientSince that disagrees with awaiting_client',
      sql: `SELECT NOT EXISTS (SELECT 1 FROM "public"."bug_report" WHERE ("status" = 'awaiting_client') <> ("awaitingClientSince" IS NOT NULL)) AS "result"`,
    },
    {
      description: 'no bug that is not closed has a resolution',
      sql: `SELECT NOT EXISTS (SELECT 1 FROM "public"."bug_report" WHERE "resolution" IS NOT NULL AND "status" <> 'closed') AS "result"`,
    },
    {
      description: 'no job is both completed and dead',
      sql: `SELECT NOT EXISTS (SELECT 1 FROM "public"."job" WHERE "completedAt" IS NOT NULL AND "deadAt" IS NOT NULL) AS "result"`,
    },
    {
      description: 'no task has a status that disagrees with completedAt',
      sql: `SELECT NOT EXISTS (SELECT 1 FROM "public"."task" WHERE ("status" = 'done') <> ("completedAt" IS NOT NULL)) AS "result"`,
    },
    {
      description: 'no webhook delivery has an unknown status',
      sql: `SELECT NOT EXISTS (SELECT 1 FROM "public"."webhook_delivery" WHERE "status" NOT IN ('pending', 'retrying', 'succeeded', 'dead')) AS "result"`,
    },
  ],
  execute: [{ description: 'nothing to change before the constraints', sql: 'SELECT 1' }],
  postcheck: [],
});

export default class M extends Migration<Start, End> {
  override readonly startContractJson = startContract;
  override readonly endContractJson = endContract;

  override get operations() {
    return [
      checkExistingRows,
      this.addCheckConstraint({
        schema: 'public',
        table: 'automation_run',
        constraint: 'automation_run_outcome_valid_29e3ad35',
        expression: `"outcome" IN ('matched', 'skipped', 'failed')`,
      }),
      this.addCheckConstraint({
        schema: 'public',
        table: 'bug_report',
        constraint: 'bug_report_awaiting_client_pair_494655f1',
        expression: `("status" = 'awaiting_client') = ("awaitingClientSince" IS NOT NULL)`,
      }),
      this.addCheckConstraint({
        schema: 'public',
        table: 'bug_report',
        constraint: 'bug_report_before_needs_info_valid_0ad0ae63',
        expression: `"statusBeforeNeedsInfo" IS NULL OR "statusBeforeNeedsInfo" IN ('triaged', 'in_progress', 'in_verification')`,
      }),
      this.addCheckConstraint({
        schema: 'public',
        table: 'bug_report',
        constraint: 'bug_report_needs_info_pair_7cacfb21',
        expression: `("status" = 'needs_info') = ("needsInfoSince" IS NOT NULL) AND ("status" = 'needs_info') = ("statusBeforeNeedsInfo" IS NOT NULL)`,
      }),
      this.addCheckConstraint({
        schema: 'public',
        table: 'bug_report',
        constraint: 'bug_report_resolution_closed_dba429df',
        expression: `"resolution" IS NULL OR "status" = 'closed'`,
      }),
      this.addCheckConstraint({
        schema: 'public',
        table: 'job',
        constraint: 'job_not_completed_and_dead_f35d1ed7',
        expression: 'NOT ("completedAt" IS NOT NULL AND "deadAt" IS NOT NULL)',
      }),
      this.addCheckConstraint({
        schema: 'public',
        table: 'task',
        constraint: 'task_completion_pair_38c1713e',
        expression: `("status" = 'done') = ("completedAt" IS NOT NULL)`,
      }),
      this.addCheckConstraint({
        schema: 'public',
        table: 'webhook_delivery',
        constraint: 'webhook_delivery_status_valid_ede2f52d',
        expression: `"status" IN ('pending', 'retrying', 'succeeded', 'dead')`,
      }),
    ];
  }
}

MigrationCLI.run(import.meta.url, M);

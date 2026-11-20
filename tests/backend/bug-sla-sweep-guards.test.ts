import { expect, it } from "bun:test";

import { db } from "../../src/prisma/db";
import { runSlaSweep } from "../../src/server/work/bug-sla-sweep";
import type { Transaction } from "../../src/server/work/work-internal";
import { authPool, personaId } from "./support/action-harness";
import {
  at,
  installHooks,
  pinClocks,
  slaNotices,
  slaOf,
  submit,
  sweep,
  taskOf,
} from "./support/bug-sla-fixtures";

installHooks();

// Monday 09:00, both clocks due the same day; the sweeps below run after that.
const DUE_TODAY = {
  createdAt: "2026-10-05T09:00:00Z",
  firstResponseDueAt: "2026-10-05T13:00:00Z",
  resolutionDueAt: "2026-10-05T18:00:00Z",
  resolutionStartedAt: "2026-10-05T09:00:00Z",
};

// The sweep reads the open clocks first and claims a flag later. A status
// change that resolves the bug in between cannot be timed from a test, so this
// hands the sweep the clocks as they were before, while the database already
// holds the resolved row. The claim must notice.
const withStaleClockRead = (
  transaction: Transaction,
  stale: readonly object[]
): Transaction => {
  let served = false;
  const bugSla = transaction.orm.public.BugSla;
  const patchedBugSla = new Proxy(bugSla, {
    get(target, property) {
      if (property === "where") {
        return (filter: unknown) => {
          if (!served) {
            served = true;
            const page = { all: () => Promise.resolve(stale) };
            return { orderBy: () => ({ limit: () => page }) };
          }
          return target.where(filter as never);
        };
      }
      const value = Reflect.get(target, property) as unknown;
      return typeof value === "function" ? value.bind(target) : value;
    },
  });
  const publicSchema = new Proxy(transaction.orm.public, {
    get: (target, property) =>
      property === "BugSla" ? patchedBugSla : Reflect.get(target, property),
  });
  const orm = new Proxy(transaction.orm, {
    get: (target, property) =>
      property === "public" ? publicSchema : Reflect.get(target, property),
  });
  return new Proxy(transaction, {
    get: (target, property) =>
      property === "orm" ? orm : Reflect.get(target, property),
  });
};

it("does not flag a breach on a clock the bug resolved after the sweep read it", async () => {
  const bugId = await submit("Resolved during the sweep");
  const taskId = await taskOf(bugId);
  await pinClocks(bugId, DUE_TODAY);
  const open = await db.orm.public.BugSla.where({ bugId }).first();
  if (!open) {
    throw new Error("sla row missing");
  }
  // The bug is answered and resolved before the sweep claims its flags.
  await pinClocks(bugId, {
    firstRespondedAt: "2026-10-05T10:00:00Z",
    resolvedAt: "2026-10-05T11:00:00Z",
  });

  const notices = await db.transaction((transaction) =>
    runSlaSweep(
      withStaleClockRead(transaction, [open]),
      at("2026-10-05T19:00:00Z")
    )
  );

  expect(notices).toBe(0);
  expect(await slaOf(bugId)).toMatchObject({
    breachedResolution: false,
    breachedResponse: false,
  });
  expect(await slaNotices(personaId("admin"), taskId)).toEqual([]);
});

it("does not flag a resolution breach on a clock paused after the sweep read it", async () => {
  const bugId = await submit("Paused during the sweep");
  await pinClocks(bugId, {
    ...DUE_TODAY,
    firstRespondedAt: "2026-10-05T10:00:00Z",
  });
  const open = await db.orm.public.BugSla.where({ bugId }).first();
  if (!open) {
    throw new Error("sla row missing");
  }
  await pinClocks(bugId, { pausedAt: "2026-10-05T12:00:00Z" });

  await db.transaction((transaction) =>
    runSlaSweep(
      withStaleClockRead(transaction, [open]),
      at("2026-10-05T19:00:00Z")
    )
  );
  expect(await slaOf(bugId)).toMatchObject({ breachedResolution: false });

  // Unpaused, the same overdue clock is flagged as usual.
  await pinClocks(bugId, { pausedAt: null });
  await sweep("2026-10-05T19:00:00Z");
  expect(await slaOf(bugId)).toMatchObject({ breachedResolution: true });
});

// Sweeping 600+ clocks across two pages takes ~17s on a quiet machine; the default 30s
// leaves too little room when the machine is busy.
it("reaches every open clock when there are more than one page of them", async () => {
  const bugId = await submit("First of many");
  await pinClocks(bugId, DUE_TODAY);
  // 600 more overdue clocks, cloned from the first bug, so they span two pages.
  const cloned = await authPool.query<{ id: string }>(
    `WITH base_task AS (
       SELECT t.* FROM task t JOIN bug_report b ON b."taskId" = t.id WHERE b.id = $1
     ), top AS (
       SELECT max("projectTaskNumber") AS n FROM task WHERE "projectId" = (SELECT "projectId" FROM base_task)
     ), copies AS (
       SELECT gen_random_uuid() AS task_id, gen_random_uuid() AS bug_id, n
       FROM generate_series(1, 600) AS n
     ), new_tasks AS (
       INSERT INTO task
       SELECT (jsonb_populate_record(NULL::task, to_jsonb(base_task) || jsonb_build_object('id', c.task_id, 'projectTaskNumber', top.n + c.n))).*
       FROM base_task, top, copies c
       RETURNING id
     ), new_bugs AS (
       INSERT INTO bug_report
       SELECT (jsonb_populate_record(NULL::bug_report, to_jsonb(b) || jsonb_build_object('id', c.bug_id, 'taskId', c.task_id))).*
       FROM bug_report b, copies c, (SELECT count(*) FROM new_tasks) AS ready
       WHERE b.id = $1
       RETURNING id
     )
     INSERT INTO bug_sla
     SELECT (jsonb_populate_record(NULL::bug_sla, to_jsonb(s) || jsonb_build_object('bugId', c.bug_id))).*
     FROM bug_sla s, copies c, (SELECT count(*) FROM new_bugs) AS ready
     WHERE s."bugId" = $1
     RETURNING "bugId" AS id`,
    [bugId]
  );
  expect(cloned.rows).toHaveLength(600);

  await sweep("2026-10-05T19:00:00Z");

  const missed = await authPool.query<{ count: string }>(
    'SELECT count(*) FROM bug_sla WHERE "bugId" = ANY($1::uuid[]) AND NOT ("breachedResponse" AND "breachedResolution")',
    [[bugId, ...cloned.rows.map(({ id }) => id)]]
  );
  expect(missed.rows[0]?.count).toBe("0");
}, 90_000);

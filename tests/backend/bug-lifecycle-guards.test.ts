import { expect, it } from "bun:test";

import { db } from "../../src/prisma/db";
import {
  autoCloseAwaitingClient,
  autoCloseNeedsInfo,
  remindNeedsInfo,
} from "../../src/server/work/bug-workflow-client-jobs";
import { remindUnpickedClientBug } from "../../src/server/work/bug-workflow-pick";
import { authPool, callAs, nextKey, personaId } from "./support/action-harness";
import {
  bugActions,
  bugClientActions,
  DAY_MS,
  force,
  installHooks,
  noticesFor,
  pick,
  portal,
  state,
  submit,
} from "./support/client-lifecycle-fixtures";

installHooks();

const versionOf = async (bugId: string): Promise<number> => {
  const row = await state(bugId);
  return row.version;
};

const archive = async (bugId: string): Promise<void> => {
  const archived = await callAs("admin", bugActions.archiveBugAction, {
    bugId,
    expectedVersion: await versionOf(bugId),
  });
  expect(archived).toMatchObject({ ok: true });
};

const askClient = async (bugId: string) =>
  callAs("owner", bugClientActions.requestClientInfoAction, {
    bugId,
    expectedVersion: await versionOf(bugId),
    question: "Can you share a screenshot?",
  });

const reminderJobs = async (bugId: string): Promise<string[]> => {
  const rows = await authPool.query<{ dedupeKey: string }>(
    "SELECT \"dedupeKey\" FROM job WHERE kind = 'bug.client_unpicked_reminder' AND payload->>'bugId' = $1 ORDER BY \"createdAt\"",
    [bugId]
  );
  return rows.rows.map(({ dedupeKey }) => dedupeKey);
};

it("stops the needs-info reminder and auto-close once the bug is archived", async () => {
  const bugId = await submit("Archived while waiting");
  await pick(bugId);
  expect(await askClient(bugId)).toMatchObject({ ok: true });
  const waiting = await state(bugId);
  const since = waiting.needsInfoSince ?? new Date();
  await archive(bugId);
  const archived = await state(bugId);
  const before = await noticesFor(personaId("client"), waiting.taskId);

  const reminded = await db.transaction((transaction) =>
    remindNeedsInfo(transaction, bugId, since)
  );
  const closed = await db.transaction((transaction) =>
    autoCloseNeedsInfo(transaction, bugId, since)
  );

  expect(reminded).toBe(false);
  expect(closed).toBe(false);
  expect(await state(bugId)).toMatchObject({
    resolution: null,
    status: "needs_info",
    version: archived.version,
  });
  expect(await noticesFor(personaId("client"), waiting.taskId)).toEqual(before);
});

it("does not auto-close an archived fix that waits on the client, but does once restored", async () => {
  const bugId = await submit("Archived while verifying");
  await pick(bugId);
  const since = new Date(Date.now() - 7 * DAY_MS);
  await force(bugId, "awaiting_client", {
    awaitingClientSince: since.toISOString(),
  });
  await archive(bugId);

  const closedArchived = await db.transaction((transaction) =>
    autoCloseAwaitingClient(transaction, bugId, since)
  );
  expect(closedArchived).toBe(false);
  expect(await state(bugId)).toMatchObject({ status: "awaiting_client" });

  const restored = await callAs("admin", bugActions.restoreBugAction, {
    bugId,
    expectedVersion: await versionOf(bugId),
  });
  expect(restored).toMatchObject({ ok: true });
  const closed = await db.transaction((transaction) =>
    autoCloseAwaitingClient(transaction, bugId, since)
  );
  expect(closed).toBe(true);
  expect(await state(bugId)).toMatchObject({
    resolution: "unconfirmed",
    status: "closed",
  });
});

it("does not nag admins about an archived unpicked client bug", async () => {
  const live = await submit("Unpicked and live");
  const hidden = await submit("Unpicked and archived");
  await archive(hidden);

  const [remindedLive, remindedHidden] = await db.transaction(
    async (transaction) => [
      await remindUnpickedClientBug(transaction, live),
      await remindUnpickedClientBug(transaction, hidden),
    ]
  );

  expect(remindedLive).toBe(true);
  expect(remindedHidden).toBe(false);
  const { taskId: hiddenTask } = await state(hidden);
  expect(await noticesFor(personaId("admin"), hiddenTask)).not.toContainEqual(
    expect.stringContaining("Nobody has picked up")
  );
});

it("refuses to ask the client about an archived bug", async () => {
  const bugId = await submit("Ask after archive");
  await pick(bugId);
  await archive(bugId);
  const before = await state(bugId);

  const asked = await askClient(bugId);

  expect(asked).toMatchObject({ error: { code: "FORBIDDEN" }, ok: false });
  expect(await state(bugId)).toMatchObject({
    needsInfoSince: null,
    status: before.status,
    version: before.version,
  });
});

it("clears the client's rating when an admin reopens a confirmed fix", async () => {
  const bugId = await submit("Rated then reopened");
  await pick(bugId);
  await force(bugId, "awaiting_client", {
    awaitingClientSince: new Date().toISOString(),
  });
  const confirmed = await callAs("client", portal.confirmClientFixAction, {
    bugId,
    expectedVersion: await versionOf(bugId),
    idempotencyKey: nextKey(),
    satisfaction: "up",
  });
  expect(confirmed).toMatchObject({ ok: true });
  expect(await state(bugId)).toMatchObject({
    resolution: "confirmed",
    satisfaction: "up",
  });
  const closed = await state(bugId);

  // A stale version is refused and leaves the rating where it was.
  const stale = await callAs("admin", bugActions.reopenBugAction, {
    bugId,
    expectedVersion: closed.version - 1,
  });
  expect(stale).toMatchObject({ error: { code: "CONFLICT" }, ok: false });
  expect(await state(bugId)).toMatchObject({ satisfaction: "up" });

  const reopened = await callAs("admin", bugActions.reopenBugAction, {
    bugId,
    expectedVersion: closed.version,
  });
  expect(reopened).toMatchObject({ ok: true });
  const satisfactionComment = await authPool.query<{
    satisfactionComment: string | null;
  }>('SELECT "satisfactionComment" FROM bug_report WHERE id = $1', [bugId]);
  expect(await state(bugId)).toMatchObject({
    resolution: null,
    satisfaction: null,
    status: "in_progress",
  });
  expect(satisfactionComment.rows[0]?.satisfactionComment).toBeNull();
});

it("announces an unpicked report the client sends back, with a fresh reminder", async () => {
  const bugId = await submit("Unpicked and still broken");
  expect(await reminderJobs(bugId)).toEqual([
    `bug.client_unpicked_reminder:${bugId}`,
  ]);
  await force(bugId, "awaiting_client", {
    awaitingClientSince: new Date().toISOString(),
  });
  const reopen = async () =>
    callAs("client", portal.reopenClientFixAction, {
      bugId,
      expectedVersion: await versionOf(bugId),
      idempotencyKey: nextKey(),
      reason: "Still broken",
    });

  expect(await reopen()).toMatchObject({ ok: true });

  const reopened = await state(bugId);
  expect(reopened).toMatchObject({ clientReopenCount: 1, status: "reported" });
  expect(await reminderJobs(bugId)).toEqual([
    `bug.client_unpicked_reminder:${bugId}`,
    `bug.client_unpicked_reminder:${bugId}:reopen-1`,
  ]);
  expect(await noticesFor(personaId("owner"), reopened.taskId)).toContainEqual(
    expect.stringContaining("still broken")
  );
  // A second reopen is refused while the bug is back in the queue, and arms
  // nothing more.
  expect(await reopen()).toMatchObject({ ok: false });
  expect(await reminderJobs(bugId)).toHaveLength(2);
});

it("does not re-announce a picked report the client sends back", async () => {
  const bugId = await submit("Picked and still broken");
  await pick(bugId);
  await force(bugId, "awaiting_client", {
    awaitingClientSince: new Date().toISOString(),
  });
  const reopened = await callAs("client", portal.reopenClientFixAction, {
    bugId,
    expectedVersion: await versionOf(bugId),
    idempotencyKey: nextKey(),
    reason: "Still broken",
  });
  expect(reopened).toMatchObject({ ok: true });
  expect(await state(bugId)).toMatchObject({ status: "triaged" });
  expect(await reminderJobs(bugId)).toHaveLength(1);
});

import { randomUUID } from "node:crypto";

import { and, or } from "@prisma/orm-postgres/orm-client";

import { loadSlaSettings } from "../company/sla-settings";
import { activeAdminIds } from "../notifications/notify-users";
import { SLA_SWEEP_INTERVAL_MS, SLA_SWEEP_JOB, WARNING_RATIO } from "./bug-sla";
import {
  assigneeIdsOf,
  keyOf,
  notifySla,
  warningRecipients,
} from "./bug-sla-sweep-notify";
import type { SweepContext } from "./bug-sla-sweep-notify";
import { businessElapsedMs } from "./business-time";
import type { Transaction } from "./work-internal";

type ClockName = "response" | "resolution";

// The clock must still be running when the flag is claimed: the sweep read
// the row earlier, and a status change may have answered, resolved or paused
// the bug since.
const clockStillOpen = {
  resolution: { pausedAt: null, resolvedAt: null },
  response: { firstRespondedAt: null, resolvedAt: null },
} as const satisfies Record<ClockName, object>;

// Flags are claimed with a guarded update, so a warning or breach goes out
// once even if two sweeps overlap.
const claimFlag = async (
  transaction: Transaction,
  bugId: string,
  clock: ClockName,
  flags: Record<string, boolean>,
  guard:
    | "warnedResponse"
    | "warnedResolution"
    | "breachedResponse"
    | "breachedResolution",
  now: Date
): Promise<boolean> => {
  const claimed = await transaction.orm.public.BugSla.where({
    ...clockStillOpen[clock],
    bugId,
    [guard]: false,
  }).updateAndCount({ ...flags, updatedAt: now });
  return claimed > 0;
};

const sweepClock = async (
  transaction: Transaction,
  context: SweepContext,
  clock: ClockName
): Promise<number> => {
  const { sla, settings, now } = context;
  const response = clock === "response";
  const start = response ? sla.createdAt : sla.resolutionStartedAt;
  const dueAt = response ? sla.firstResponseDueAt : sla.resolutionDueAt;
  const spentOnPause = response ? 0 : sla.pausedBusinessMs;
  const total =
    businessElapsedMs(start, dueAt, settings.calendar) - spentOnPause;
  const elapsed =
    businessElapsedMs(start, now, settings.calendar) - spentOnPause;
  const label = response ? "first response" : "resolution";

  if (now.getTime() >= dueAt.getTime()) {
    const claimed = await claimFlag(
      transaction,
      sla.bugId,
      clock,
      response
        ? { breachedResponse: true, warnedResponse: true }
        : { breachedResolution: true, warnedResolution: true },
      response ? "breachedResponse" : "breachedResolution",
      now
    );
    if (!claimed) {
      return 0;
    }
    const assignees = await assigneeIdsOf(transaction, context.bug.taskId);
    await notifySla(
      transaction,
      context,
      [...assignees, ...context.adminIds],
      `${context.key} breached its ${label} target`
    );
    return 1;
  }
  const warned = response ? sla.warnedResponse : sla.warnedResolution;
  if (!warned && total > 0 && elapsed >= WARNING_RATIO * total) {
    const claimed = await claimFlag(
      transaction,
      sla.bugId,
      clock,
      response ? { warnedResponse: true } : { warnedResolution: true },
      response ? "warnedResponse" : "warnedResolution",
      now
    );
    if (!claimed) {
      return 0;
    }
    await notifySla(
      transaction,
      context,
      await warningRecipients(transaction, context),
      `${context.key} is at 75% of its ${label} target`
    );
    return 1;
  }
  return 0;
};

const sweepBug = async (
  transaction: Transaction,
  context: SweepContext
): Promise<number> => {
  const { sla } = context;
  let notices = 0;
  // A bug that left the queue unanswered (withdrawn, merged, closed) no
  // longer owes a first response.
  if (!(sla.firstRespondedAt || sla.resolvedAt || sla.breachedResponse)) {
    notices += await sweepClock(transaction, context, "response");
  }
  if (!sla.resolvedAt && !sla.pausedAt && !sla.breachedResolution) {
    notices += await sweepClock(transaction, context, "resolution");
  }
  return notices;
};

const SWEEP_BATCH_SIZE = 500;

// One page of open clocks, after the given bug id. Paging in a fixed order
// means every open clock is looked at on each sweep, however many there are.
const openClocksAfter = (
  transaction: Transaction,
  afterBugId: string | undefined
) =>
  transaction.orm.public.BugSla.where((sla) => {
    const open = or(
      and(
        sla.firstRespondedAt.isNull(),
        sla.resolvedAt.isNull(),
        sla.breachedResponse.eq(false)
      ),
      and(
        sla.resolvedAt.isNull(),
        sla.pausedAt.isNull(),
        sla.breachedResolution.eq(false)
      )
    );
    return afterBugId === undefined
      ? open
      : and(sla.bugId.gt(afterBugId), open);
  })
    .orderBy((sla) => sla.bugId.asc())
    .limit(SWEEP_BATCH_SIZE)
    .all();

const sweepBatch = async (
  transaction: Transaction,
  open: readonly SweepContext["sla"][],
  shared: Pick<SweepContext, "adminIds" | "now" | "settings">
): Promise<number> => {
  const bugs = await transaction.orm.public.BugReport.where((bug) =>
    bug.id.in(open.map(({ bugId }) => bugId))
  )
    .select("id", "clientCompanyId", "taskId", "projectId")
    .all();
  const bugById = new Map(bugs.map((bug) => [bug.id, bug]));
  const tasks = await transaction.orm.public.Task.where((task) =>
    task.id.in(bugs.map(({ taskId }) => taskId))
  )
    .select("id", "title", "projectId", "projectTaskNumber", "archivedAt")
    .all();
  const taskById = new Map(tasks.map((task) => [task.id, task]));
  const projects = await transaction.orm.public.Project.where((project) =>
    project.id.in([...new Set(bugs.map(({ projectId }) => projectId))])
  )
    .select("id", "key", "archivedAt")
    .all();
  const projectById = new Map(projects.map((project) => [project.id, project]));
  // Bugs touch only their own SLA row and notices, so they are swept
  // together; the clocks within one bug still run in turn.
  const notices = await Promise.all(
    open.map((sla) => {
      const bug = bugById.get(sla.bugId);
      const task = bug ? taskById.get(bug.taskId) : undefined;
      const project = bug ? projectById.get(bug.projectId) : undefined;
      // Archived work is read only: its clocks raise no notices.
      if (!bug || !task || !project || task.archivedAt || project.archivedAt) {
        return 0;
      }
      return sweepBug(transaction, {
        ...shared,
        bug,
        key: keyOf(project, task),
        sla,
        title: task.title,
      });
    })
  );
  return notices.reduce((total, count) => total + count, 0);
};

// Sweeps one page, then the pages after it in turn.
const sweepFrom = async (
  transaction: Transaction,
  afterBugId: string | undefined,
  shared: Pick<SweepContext, "adminIds" | "now" | "settings">
): Promise<number> => {
  const open = await openClocksAfter(transaction, afterBugId);
  const last = open.at(-1);
  if (!last) {
    return 0;
  }
  const notices = await sweepBatch(transaction, open, shared);
  return open.length < SWEEP_BATCH_SIZE
    ? notices
    : notices + (await sweepFrom(transaction, last.bugId, shared));
};

// Checks every open clock; warns at 75% of the target and alerts on breach.
// Returns how many notices went out.
export const runSlaSweep = async (
  transaction: Transaction,
  now: Date
): Promise<number> => {
  const [settings, adminIds] = await Promise.all([
    loadSlaSettings(transaction),
    activeAdminIds(transaction),
  ]);
  return sweepFrom(transaction, undefined, { adminIds, now, settings });
};

// The sweep runs every five minutes; one job per interval keeps a busy
// scheduler from queueing it twice.
const slaSweepDedupeKey = (at: Date): string =>
  `${SLA_SWEEP_JOB}:${Math.floor(at.getTime() / SLA_SWEEP_INTERVAL_MS)}`;

export const enqueueSlaSweep = async (
  transaction: Pick<Transaction, "orm">,
  at: Date
): Promise<void> => {
  const dedupeKey = slaSweepDedupeKey(at);
  await transaction.orm.public.Job.upsert({
    conflictOn: { dedupeKey },
    create: {
      availableAt: at,
      createdAt: at,
      dedupeKey,
      id: randomUUID(),
      kind: SLA_SWEEP_JOB,
      payload: {},
      updatedAt: at,
    },
    update: { updatedAt: at },
  });
};

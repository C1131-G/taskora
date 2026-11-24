import type { BugWorkflowStatusSchema } from "./bug-contracts";

type Status = typeof BugWorkflowStatusSchema.Type;

// Every move a bug may make, from the workflow actions themselves: triage,
// investigation, the client's answer or verification, approval, release,
// withdrawal and the admin's reopen. `updateBugStatus` refuses anything else,
// so a caller with a wrong check cannot push a bug somewhere it cannot be.
// The record type makes a new status fail to compile until it is placed here.
const EDGES: Readonly<Record<Status, readonly Status[]>> = {
  approved_for_release: ["released"],
  awaiting_admin_approval: ["approved_for_release", "rejected"],
  awaiting_client: ["closed", "triaged", "reported", "in_progress"],
  closed: ["in_progress"],
  // Handed to its client when the original ships; closed with it when the
  // original is closed as not a bug.
  duplicate: ["awaiting_client", "closed"],
  // A move to the same status is the fix attempt being updated in place.
  in_progress: ["in_progress", "in_verification", "needs_info", "closed"],
  // "in_progress" is the "Back to fixing" action after a passed verification.
  in_verification: ["in_progress", "awaiting_admin_approval", "needs_info"],
  // Answered, the bug returns to the status it was asked from.
  needs_info: ["triaged", "in_progress", "in_verification", "closed"],
  rejected: ["in_progress"],
  released: ["closed", "awaiting_client"],
  // "closed" here is the handler closing a report as not a bug.
  reported: ["triaged", "duplicate", "withdrawn", "closed"],
  triaged: ["in_progress", "duplicate", "needs_info", "closed"],
  withdrawn: [],
};

const isBugStatus = (value: string): value is Status =>
  Object.hasOwn(EDGES, value);

export const BUG_STATUSES: readonly Status[] =
  Object.keys(EDGES).filter(isBugStatus);

export const BUG_STATUS_EDGES = EDGES;

export const canMoveBug = (from: string, to: string): boolean =>
  isBugStatus(from) && isBugStatus(to) && EDGES[from].includes(to);

// Status groups that more than one place asks about. The server and the UI
// import them from here (this module has no runtime dependencies), so a list
// cannot drift between copies. Each entry is checked against the status union.
interface StatusGroup extends Iterable<Status> {
  // Takes any string so a raw database or wire value can be asked directly.
  readonly has: (status: string) => boolean;
}

const statusGroup = (statuses: readonly Status[]): StatusGroup => ({
  has: (status) => statuses.some((member) => member === status),
  [Symbol.iterator]: () => statuses[Symbol.iterator](),
});

// Finished for good: the task counts as done and nothing is owed any more.
export const COMPLETED_BUG_STATUSES = statusGroup([
  "closed",
  "duplicate",
  "withdrawn",
]);

// Staff cannot edit the bug here; only an admin decision (approve, release,
// post-release check, reopen) or the client moves it on.
export const READ_ONLY_BUG_STATUSES = statusGroup([
  "closed",
  "duplicate",
  "awaiting_admin_approval",
  "approved_for_release",
  "released",
  "awaiting_client",
  "withdrawn",
]);

// Where an assignee may ask the client a question (to needs_info).
export const ASK_CLIENT_FROM_STATUSES = statusGroup([
  "triaged",
  "in_progress",
  "in_verification",
]);

// Where an assignee may close a client report as not a bug.
export const CLOSE_NOT_A_BUG_FROM_STATUSES = statusGroup([
  "reported",
  "triaged",
  "in_progress",
  "needs_info",
]);

// Where an admin may reopen a bug back to in_progress.
export const ADMIN_REOPEN_FROM_STATUSES = statusGroup([
  "closed",
  "awaiting_client",
  "needs_info",
]);

import { expect, test } from "bun:test";

import {
  BUG_STATUS_FILTERS,
  parseBugFilters,
} from "../../features/bugs/bug-filters";
import { BUG_BOARD_COLUMNS } from "../../features/bugs/components/bug-board-columns";
import { internalStatusesFor } from "../../features/portal/client-status";
import {
  ADMIN_REOPEN_FROM_STATUSES,
  ASK_CLIENT_FROM_STATUSES,
  BUG_STATUSES,
  BUG_STATUS_EDGES,
  CLOSE_NOT_A_BUG_FROM_STATUSES,
  COMPLETED_BUG_STATUSES,
  READ_ONLY_BUG_STATUSES,
} from "../../src/server/work/bug-status-edges";

test("every bug status sits in exactly one board column", () => {
  const placed = BUG_BOARD_COLUMNS.flatMap(({ states }) => states);
  expect([...placed].toSorted()).toEqual([...BUG_STATUSES].toSorted());
  const byStatus = new Map(
    BUG_BOARD_COLUMNS.flatMap(({ id, states }) =>
      states.map((status) => [status, id] as const)
    )
  );
  expect(byStatus.get("needs_info")).toBe("working");
  expect(byStatus.get("awaiting_client")).toBe("release");
  expect(byStatus.get("withdrawn")).toBe("closed");
});

test("every bug status can be filtered on, and only those", () => {
  const values = BUG_STATUS_FILTERS.map(([value]) => value).filter(Boolean);
  expect([...values].toSorted()).toEqual([...BUG_STATUSES].toSorted());
  expect(parseBugFilters({ status: "withdrawn" }).status).toBe("withdrawn");
  expect(parseBugFilters({ status: "nonsense" }).status).toBe("");
});

test("completed bugs are the ones no workflow action continues", () => {
  expect([...COMPLETED_BUG_STATUSES].toSorted()).toEqual([
    "closed",
    "duplicate",
    "withdrawn",
  ]);
  // A released bug still owes a post-release check, so it is not done.
  expect(COMPLETED_BUG_STATUSES.has("released")).toBe(false);
  for (const status of COMPLETED_BUG_STATUSES) {
    expect(READ_ONLY_BUG_STATUSES.has(status)).toBe(true);
  }
});

test("each action group only starts from statuses with the matching edge", () => {
  const edges: Readonly<Record<string, readonly string[]>> = BUG_STATUS_EDGES;
  for (const status of ASK_CLIENT_FROM_STATUSES) {
    expect(edges[status]).toContain("needs_info");
  }
  for (const status of CLOSE_NOT_A_BUG_FROM_STATUSES) {
    expect(edges[status]).toContain("closed");
  }
  for (const status of ADMIN_REOPEN_FROM_STATUSES) {
    expect(edges[status]).toContain("in_progress");
  }
});

test("the portal's client labels still cover every internal status", () => {
  const covered = [
    "submitted",
    "acknowledged",
    "in_progress",
    "waiting_for_reply",
    "fix_ready",
    "closed",
    "merged",
    "withdrawn",
  ] as const;
  const all = covered.flatMap((label) => internalStatusesFor(label));
  expect([...all].toSorted()).toEqual([...BUG_STATUSES].toSorted());
});

import type { BugWorkflowStatusSchema } from "@/src/server/work/bug-contracts";
import { BUG_STATUSES } from "@/src/server/work/bug-status-edges";

type BugStatus = typeof BugWorkflowStatusSchema.Type;

const COLUMN_LABELS = {
  closed: "Closed",
  release: "Release",
  reported: "Reported",
  verification: "Verification & approval",
  working: "In progress",
} as const;

type BugBoardColumnId = keyof typeof COLUMN_LABELS;

const COLUMN_ORDER: readonly BugBoardColumnId[] = [
  "reported",
  "working",
  "verification",
  "release",
  "closed",
];

// Every status has exactly one column, so no bug falls off the board; a new
// status fails to compile until it is placed here.
const COLUMN_OF_STATUS: Readonly<Record<BugStatus, BugBoardColumnId>> = {
  approved_for_release: "release",
  awaiting_admin_approval: "verification",
  awaiting_client: "release",
  closed: "closed",
  duplicate: "closed",
  in_progress: "working",
  in_verification: "verification",
  needs_info: "working",
  rejected: "working",
  released: "release",
  reported: "reported",
  triaged: "reported",
  withdrawn: "closed",
};

// The board's stages, shared by the board and its loading state.
export const BUG_BOARD_COLUMNS = COLUMN_ORDER.map((id) => ({
  id,
  label: COLUMN_LABELS[id],
  states: BUG_STATUSES.filter((status) => COLUMN_OF_STATUS[status] === id),
}));

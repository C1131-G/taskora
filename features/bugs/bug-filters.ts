import type { BugWorkflowStatusSchema } from "@/src/server/work/bug-contracts";

const BUG_STATUS_FILTERS = [
  ["", "All"],
  ["reported", "Reported"],
  ["triaged", "Triaged"],
  ["in_progress", "In progress"],
  ["needs_info", "Needs info"],
  ["awaiting_client", "Awaiting client"],
  ["in_verification", "Verification"],
  ["awaiting_admin_approval", "Approval"],
  ["approved_for_release", "Approved"],
  ["released", "Released"],
  ["rejected", "Changes requested"],
  ["closed", "Closed"],
  ["duplicate", "Duplicate"],
  ["withdrawn", "Withdrawn"],
] as const;

// Every bug status has a filter: this fails to compile when one is missing.
type UnfilteredStatus = Exclude<
  typeof BugWorkflowStatusSchema.Type,
  (typeof BUG_STATUS_FILTERS)[number][0]
>;
const _everyStatusFiltered: [UnfilteredStatus] extends [never] ? true : never =
  true;

const BUG_SEVERITIES = [
  "blocker",
  "critical",
  "major",
  "minor",
  "trivial",
] as const;

type BugStatusFilter = (typeof BUG_STATUS_FILTERS)[number][0];
type BugSeverity = (typeof BUG_SEVERITIES)[number];

interface BugFilters {
  readonly archived: boolean;
  readonly query: string;
  readonly severity: BugSeverity | undefined;
  readonly status: BugStatusFilter;
  readonly taskId: string | null;
  readonly view: "board" | "client_queue" | "list";
}

type RawSearchParams = Record<string, string | string[] | undefined>;

// Repeated query keys arrive as arrays; only a single value is honoured.
const single = (value: string | string[] | undefined): string =>
  typeof value === "string" ? value : "";

const parseBugFilters = (params: RawSearchParams): BugFilters => {
  const status = single(params["status"]);
  const severity = single(params["severity"]);
  const task = single(params["task"]);
  const view = single(params["view"]);
  return {
    archived: single(params["archived"]) === "true",
    query: single(params["q"]),
    severity: BUG_SEVERITIES.find((value) => value === severity),
    status: BUG_STATUS_FILTERS.find(([value]) => value === status)?.[0] ?? "",
    taskId: task || null,
    view: view === "board" || view === "client_queue" ? view : "list",
  };
};

export { BUG_STATUS_FILTERS, parseBugFilters };
export type { BugFilters };

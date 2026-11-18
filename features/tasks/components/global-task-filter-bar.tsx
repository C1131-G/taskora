/* eslint-disable shadcn/no-unknown-classes, shadcn/no-restyle */

"use client";

import { WorkspaceButton } from "@/components/workspace/workspace-button";
import { WorkspaceInput } from "@/components/workspace/workspace-controls";
import {
  WorkspaceSelect,
  WorkspaceSelectItem,
} from "@/components/workspace/workspace-select";
import {
  TASK_STATUS_LABELS,
  TASK_STATUSES,
} from "@/src/mobile-api/task-statuses";

import { defaultGlobalTaskSearch } from "../global-task-view-state";
import type { GlobalTaskSearch } from "../global-task-view-state";

const STATUS_LABELS: Readonly<Record<string, string>> = {
  all: "All statuses",
  ...TASK_STATUS_LABELS,
};

const PRIORITY_LABELS: Readonly<Record<string, string>> = {
  all: "All priorities",
  high: "High",
  low: "Low",
  medium: "Medium",
  none: "No priority",
  urgent: "Urgent",
};

const SORT_LABELS: Readonly<Record<string, string>> = {
  due: "Sort: Due date",
  priority: "Sort: Priority",
  title: "Sort: Name",
};

const GROUP_LABELS: Readonly<Record<string, string>> = {
  assignee: "Group: Assignee",
  none: "No grouping",
  priority: "Group: Priority",
  project: "Group: Project",
  status: "Group: Status",
};

const labelFor = (
  labels: Readonly<Record<string, string>>,
  value: string,
  fallback: string
) => labels[value] ?? fallback;

// Filters write to the store as the user changes them: no Apply step, and no
// server round trip, because the rows are already loaded.
export const GlobalTaskFilterBar = ({
  idPrefix,
  loading = false,
  onChange,
  raw,
  searchLabel,
  showGroup,
}: {
  readonly idPrefix: string;
  readonly loading?: boolean;
  readonly onChange: (patch: Partial<GlobalTaskSearch>) => void;
  readonly raw: GlobalTaskSearch;
  readonly searchLabel: string;
  readonly showGroup: boolean;
}) => (
  <div
    aria-hidden={loading || undefined}
    className="toolbar task-filter"
    inert={loading}
  >
    <label className="field" htmlFor={`${idPrefix}-search`}>
      <span className="sr-only">{searchLabel}</span>
      <WorkspaceInput
        aria-label={searchLabel}
        autoComplete="off"
        className="input"
        id={`${idPrefix}-search`}
        name="q"
        onChange={(event) => onChange({ q: event.currentTarget.value })}
        placeholder="Search tasks"
        type="search"
        value={raw.q}
      />
    </label>
    <label className="field" htmlFor={`${idPrefix}-status`}>
      <span className="sr-only">Filter status</span>
      <WorkspaceSelect
        ariaLabel={`Filter by status: ${labelFor(STATUS_LABELS, raw.status, "All statuses")}`}
        className="input"
        displayValue={labelFor(STATUS_LABELS, raw.status, "All statuses")}
        id={`${idPrefix}-status`}
        onValueChange={(status) => onChange({ status })}
        value={raw.status}
      >
        <WorkspaceSelectItem value="all">All statuses</WorkspaceSelectItem>
        {TASK_STATUSES.map(({ id, label }) => (
          <WorkspaceSelectItem key={id} value={id}>
            {label}
          </WorkspaceSelectItem>
        ))}
      </WorkspaceSelect>
    </label>
    <label className="field" htmlFor={`${idPrefix}-priority`}>
      <span className="sr-only">Filter priority</span>
      <WorkspaceSelect
        ariaLabel={`Filter by priority: ${labelFor(PRIORITY_LABELS, raw.priority, "All priorities")}`}
        className="input"
        displayValue={labelFor(PRIORITY_LABELS, raw.priority, "All priorities")}
        id={`${idPrefix}-priority`}
        onValueChange={(priority) => onChange({ priority })}
        value={raw.priority}
      >
        <WorkspaceSelectItem value="all">All priorities</WorkspaceSelectItem>
        <WorkspaceSelectItem value="urgent">Urgent</WorkspaceSelectItem>
        <WorkspaceSelectItem value="high">High</WorkspaceSelectItem>
        <WorkspaceSelectItem value="medium">Medium</WorkspaceSelectItem>
        <WorkspaceSelectItem value="low">Low</WorkspaceSelectItem>
        <WorkspaceSelectItem value="none">No priority</WorkspaceSelectItem>
      </WorkspaceSelect>
    </label>
    <label className="field" htmlFor={`${idPrefix}-sort`}>
      <span className="sr-only">Sort tasks</span>
      <WorkspaceSelect
        ariaLabel={`Sort tasks: ${labelFor(SORT_LABELS, raw.sort, "Sort: Due date")}`}
        className="input"
        displayValue={labelFor(SORT_LABELS, raw.sort, "Sort: Due date")}
        id={`${idPrefix}-sort`}
        onValueChange={(sort) => onChange({ sort })}
        value={raw.sort}
      >
        <WorkspaceSelectItem value="due">Sort: Due date</WorkspaceSelectItem>
        <WorkspaceSelectItem value="priority">
          Sort: Priority
        </WorkspaceSelectItem>
        <WorkspaceSelectItem value="title">Sort: Name</WorkspaceSelectItem>
      </WorkspaceSelect>
    </label>
    {showGroup ? (
      <label className="field" htmlFor={`${idPrefix}-group`}>
        <span className="sr-only">Group tasks</span>
        <WorkspaceSelect
          ariaLabel={`Group tasks: ${labelFor(GROUP_LABELS, raw.group, "Group: Status")}`}
          className="input"
          displayValue={labelFor(GROUP_LABELS, raw.group, "Group: Status")}
          id={`${idPrefix}-group`}
          onValueChange={(group) => onChange({ group })}
          value={raw.group}
        >
          <WorkspaceSelectItem value="status">
            Group: Status
          </WorkspaceSelectItem>
          <WorkspaceSelectItem value="project">
            Group: Project
          </WorkspaceSelectItem>
          <WorkspaceSelectItem value="assignee">
            Group: Assignee
          </WorkspaceSelectItem>
          <WorkspaceSelectItem value="priority">
            Group: Priority
          </WorkspaceSelectItem>
          <WorkspaceSelectItem value="none">No grouping</WorkspaceSelectItem>
        </WorkspaceSelect>
      </label>
    ) : null}
    {raw.overdue === "true" ? (
      <WorkspaceButton
        className="btn btn-sm btn-secondary"
        onClick={() => onChange({ overdue: "" })}
        type="button"
      >
        Show all due dates
      </WorkspaceButton>
    ) : null}
  </div>
);

const ignoreFilterChange = () => {
  // The loading row is inert, so no change can reach this.
};

// The loading state shows the real filter row with its default values, inert,
// so the row keeps its exact size while the tasks load.
export const GlobalTaskFilterBarSkeleton = ({
  idPrefix,
  searchLabel,
  showGroup,
}: {
  readonly idPrefix: string;
  readonly searchLabel: string;
  readonly showGroup: boolean;
}) => (
  <GlobalTaskFilterBar
    idPrefix={`${idPrefix}-loading`}
    loading
    onChange={ignoreFilterChange}
    raw={defaultGlobalTaskSearch}
    searchLabel={searchLabel}
    showGroup={showGroup}
  />
);

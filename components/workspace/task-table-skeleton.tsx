/* eslint-disable shadcn/no-unknown-classes -- Skeletons share the real workspace layout classes. */

import { SkeletonBone } from "@/components/workspace/skeleton-shapes";

const GROUPS = [
  { key: "g1", rows: ["a", "b", "c"] },
  { key: "g2", rows: ["d", "e", "f"] },
] as const;

const MY_COLUMNS = [
  "Task",
  "Project",
  "Status",
  "Priority",
  "Due date",
  "Actions",
] as const;
const GLOBAL_COLUMNS = [
  "",
  "Task",
  "Project",
  "Status",
  "Assignee",
  "Priority",
  "Due date",
  "Actions",
] as const;

// The task table frame with bones in its exact cell layout, so the data replaces
// it without any shift. `global` adds the select and assignee columns. The
// filter row above it is the caller's: it renders the real one, inert.
export const TaskTableSkeleton = ({
  global = false,
}: {
  readonly global?: boolean;
}) => {
  const columns = global ? GLOBAL_COLUMNS : MY_COLUMNS;
  return (
    <output aria-busy="true" aria-label="Loading tasks…" className="mtt-wrap">
      <span className="sr-only">Loading tasks…</span>
      <table
        aria-hidden="true"
        className={`mtt mtt-skeleton${global ? " mtt-global" : ""}`}
      >
        <colgroup>
          {global ? <col className="mtt-col-select" /> : null}
          <col className="mtt-col-task" />
          <col className="mtt-col-project mtt-opt" />
          <col className="mtt-col-status" />
          {global ? <col className="mtt-col-assignee mtt-opt" /> : null}
          <col className="mtt-col-priority" />
          <col className="mtt-col-due" />
          <col className="mtt-col-actions" />
        </colgroup>
        <thead>
          <tr>
            {columns.map((label, index) => (
              <th
                className={
                  global && (label === "Project" || label === "Assignee")
                    ? "mtt-opt"
                    : undefined
                }
                key={`${label}-${index}`}
                scope="col"
              >
                {label}
              </th>
            ))}
          </tr>
        </thead>
        {GROUPS.map((group) => (
          <tbody key={group.key}>
            <tr className="mtt-group">
              <th colSpan={global ? 6 : columns.length} scope="colgroup">
                <SkeletonBone shape="short" />
              </th>
              {global ? (
                <th aria-hidden="true" className="mtt-opt" colSpan={2} />
              ) : null}
            </tr>
            {group.rows.map((row) => (
              <tr className="mtt-row" key={row}>
                {global ? (
                  <td>
                    <SkeletonBone shape="avatar" />
                  </td>
                ) : null}
                <td className="mtt-task">
                  <div className="mtt-task-inner">
                    <SkeletonBone />
                    <SkeletonBone shape="short" />
                  </div>
                </td>
                <td className="mtt-opt">
                  <SkeletonBone shape="short" />
                </td>
                <td>
                  <SkeletonBone shape="control" />
                </td>
                {global ? (
                  <td className="mtt-opt">
                    <SkeletonBone shape="short" />
                  </td>
                ) : null}
                <td>
                  <SkeletonBone shape="short" />
                </td>
                <td>
                  <SkeletonBone shape="short" />
                </td>
                <td>
                  <span className="mtt-skeleton-actions">
                    <SkeletonBone shape="avatar" />
                    <SkeletonBone shape="avatar" />
                    <SkeletonBone shape="avatar" />
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        ))}
      </table>
    </output>
  );
};

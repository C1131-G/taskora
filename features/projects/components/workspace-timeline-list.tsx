/* eslint-disable shadcn/no-unknown-classes */

import Link from "next/link";

import type { TimelineRow } from "@/features/projects/types/workspace-timeline-types";

const initialsOf = (name: string): string =>
  name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("");

// The task column: group and milestone headings, then one link per task with its
// status, title, any dependency conflict and its first assignee.
export const TimelineTaskList = ({
  conflictIds,
  employeesById,
  rows,
}: {
  readonly conflictIds: ReadonlySet<string>;
  readonly employeesById: ReadonlyMap<string, string>;
  readonly rows: readonly TimelineRow[];
}) => (
  <ul aria-label="Timeline tasks" className="tl-rows">
    {rows.map((row) => {
      if (row.type === "group") {
        return (
          <li className="tl-row g" key={row.key}>
            <span className="trunc">{row.label}</span>
            <span className="faint">{row.count}</span>
          </li>
        );
      }
      if (row.type === "milestones") {
        let total = 0;
        for (const lane of row.lanes) {
          for (const { dueDate } of lane.allMilestones) {
            if (dueDate) {
              total += 1;
            }
          }
        }
        return (
          <li className="tl-row g" key={row.key}>
            <span aria-hidden="true" className="tl-diamond" />
            <span className="trunc">Milestones</span>
            <span className="faint">{total}</span>
          </li>
        );
      }
      const assigneeId = row.task.assigneeIds?.[0];
      const assigneeName = assigneeId
        ? employeesById.get(assigneeId)
        : undefined;
      return (
        <li className="tl-row" key={row.key}>
          <Link
            className="timeline-row-link"
            href={`/projects/${row.task.projectId}?view=board`}
            title={row.task.projectName}
          >
            <span
              aria-hidden="true"
              className="tl-status"
              data-status={row.task.status}
            />
            <span
              className={`trunc grow${row.task.status === "done" ? " tl-done" : ""}`}
            >
              {row.task.title}
            </span>
            {conflictIds.has(row.task.id) ? (
              <span
                className="tl-dep-flag"
                title="Starts before a task it depends on has ended"
              >
                Conflict
              </span>
            ) : null}
            {assigneeName ? (
              <span className="av sm tl-av" title={assigneeName}>
                <span aria-hidden="true">{initialsOf(assigneeName)}</span>
                <span className="sr-only">{assigneeName}</span>
              </span>
            ) : null}
          </Link>
        </li>
      );
    })}
  </ul>
);

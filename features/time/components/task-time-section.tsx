/* eslint-disable shadcn/no-unknown-classes */
/* eslint-disable shadcn/no-restyle */

"use client";

import { useState } from "react";

import { SkeletonBone } from "@/components/workspace/skeleton-shapes";
import { WorkspaceButton } from "@/components/workspace/workspace-button";
import { TimeEntryForm } from "@/features/time/components/time-entry-form";
import { TimeEntryList } from "@/features/time/components/time-entry-list";
import { TimerControl } from "@/features/time/components/timer-control";
import { formatMinutes, localToday } from "@/features/time/time-format";
import type { RunningTimer, TaskTime } from "@/src/server/time/time-types";

// One entry row with the real list markup, so the section keeps its height
// when the entries arrive (a task with no time logged shows a shorter note).
const TimeEntriesSkeleton = () => (
  <output aria-busy="true" aria-label="Loading time entries…" className="block">
    <span className="sr-only">Loading time entries…</span>
    <ul aria-hidden="true" className="time-entries">
      <li className="time-entry">
        <span className="time-entry-minutes">
          <SkeletonBone shape="short" />
        </span>
        <span className="time-entry-body">
          <SkeletonBone />
        </span>
      </li>
    </ul>
  </output>
);

// Time on one task or bug: a timer, a manual entry form, the running total
// and every entry. The drawer owns the data and reloads it after a change.
export const TaskTimeSection = ({
  currentUserId,
  isAdmin,
  onChanged,
  taskId,
  taskTitle,
  time,
  timer,
}: {
  readonly currentUserId: string | null;
  readonly isAdmin: boolean;
  readonly onChanged: () => Promise<void>;
  readonly taskId: string;
  readonly taskTitle?: string | undefined;
  readonly time: TaskTime | null;
  readonly timer: RunningTimer | null;
}) => {
  const [adding, setAdding] = useState(false);
  const today = localToday();
  return (
    <section aria-label="Time tracking" className="stack time-section">
      <div className="time-section-head">
        <h3>Time</h3>
      </div>
      <div className="time-stats">
        <div className="time-stat">
          <span className="time-stat-value">
            {time ? formatMinutes(time.totalMinutes) : "—"}
          </span>
          <span className="time-stat-label">Logged</span>
        </div>
        <div className="time-stat">
          <span className="time-stat-value">
            {time ? formatMinutes(time.billableMinutes) : "—"}
          </span>
          <span className="time-stat-label">Billable</span>
        </div>
      </div>
      <TimerControl
        fixedTask={{ reference: "", taskId, title: taskTitle ?? "This task" }}
        onChanged={onChanged}
        timer={timer}
      />
      {adding ? (
        <TimeEntryForm
          fixedTaskId={taskId}
          idPrefix={`task-${taskId}`}
          onCancel={() => setAdding(false)}
          onSaved={async () => {
            setAdding(false);
            await onChanged();
          }}
          today={today}
        />
      ) : (
        <WorkspaceButton
          className="btn btn-secondary time-add"
          onClick={() => setAdding(true)}
          type="button"
        >
          Add time entry
        </WorkspaceButton>
      )}
      <h4 className="time-entries-title">Entries</h4>
      {time ? (
        <TimeEntryList
          currentUserId={currentUserId}
          entries={time.entries}
          isAdmin={isAdmin}
          onChanged={onChanged}
          showPerson
          today={today}
        />
      ) : (
        <TimeEntriesSkeleton />
      )}
    </section>
  );
};

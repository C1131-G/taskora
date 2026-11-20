/* eslint-disable shadcn/no-unknown-classes, shadcn/no-inline-styles */

import type { RefObject } from "react";
import { useId, useState } from "react";

import { TimelineBar } from "@/features/projects/components/workspace-timeline-bar";
import { TimelineTaskList } from "@/features/projects/components/workspace-timeline-list";
import { TimelineMilestoneRow } from "@/features/projects/components/workspace-timeline-milestone-row";
import type { MilestoneRecord } from "@/features/projects/milestone-dates";
import { computeDependencyLayout } from "@/features/projects/timeline-dependencies";
import {
  TIMELINE_BAR_HEIGHT,
  TIMELINE_BAR_TOP,
  TIMELINE_ROW_HEIGHT,
} from "@/features/projects/timeline-geometry";
import type {
  TimelineMilestoneLane,
  TimelineRow,
  TimelineScale,
  TimelineTask,
} from "@/features/projects/types/workspace-timeline-types";
import type { TaskSpan } from "@/features/tasks/task-dates";
import { dayDiff } from "@/features/tasks/task-dates";

import {
  ARROW_MARKERS,
  DAY_FORMATTER,
  DAY_MS,
  MONTH_FORMATTER,
  WEEK_DAY_FORMATTER,
} from "./timeline-chart-format";

const ROW_HEIGHT = TIMELINE_ROW_HEIGHT;

export const WorkspaceTimelineChart = ({
  allTasks,
  dayCount,
  dayWidth,
  editableIds,
  employeesById,
  from,
  onMove,
  onMoveMilestone,
  rows,
  scale,
  today,
  viewportRef,
}: {
  // Every task, including ones the filters hide, so dependencies can be named.
  readonly allTasks: readonly TimelineTask[];
  readonly dayCount: number;
  readonly dayWidth: number;
  readonly editableIds: ReadonlySet<string>;
  readonly employeesById: ReadonlyMap<string, string>;
  readonly from: string;
  readonly onMove: (task: TimelineTask, dates: TaskSpan) => void;
  readonly onMoveMilestone: (
    lane: TimelineMilestoneLane,
    milestone: MilestoneRecord,
    dueDate: string
  ) => void;
  readonly rows: readonly TimelineRow[];
  readonly scale: TimelineScale;
  readonly today: number;
  readonly viewportRef: RefObject<HTMLDivElement | null>;
}) => {
  const idPrefix = useId();
  const [activeId, setActiveId] = useState<string | null>(null);
  const start = Date.parse(`${from}T00:00:00Z`);
  const width = dayCount * dayWidth;
  const rowIndexById = new Map<string, number>();
  for (const [index, row] of rows.entries()) {
    if (row.type === "task") {
      rowIndexById.set(row.task.id, index);
    }
  }
  const { arrows, details } = computeDependencyLayout({
    barHeight: TIMELINE_BAR_HEIGHT,
    barTop: TIMELINE_BAR_TOP,
    dayCount,
    dayWidth,
    from,
    rowHeight: ROW_HEIGHT,
    rowIndexById,
    tasks: allTasks.map((task) => ({
      dependencyIds: task.dependencyIds ?? [],
      dueDate: task.dueDate,
      id: task.id,
      startDate: task.startDate,
      status: task.status,
      title: task.title,
    })),
  });
  const conflictIds = new Set(
    [...details].flatMap(([id, detail]) => (detail.conflict ? [id] : []))
  );
  const descriptionId = (taskId: string) => `${idPrefix}-deps-${taskId}`;
  const tickInterval = scale === "week" ? 1 : 7;
  const dateTicks: Date[] = [];
  for (let index = 0; index < dayCount; index += tickInterval) {
    dateTicks.push(new Date(start + index * DAY_MS));
  }
  const monthWidths = new Map<string, { label: string; width: number }>();
  for (let index = 0; index < dayCount; index += 1) {
    const date = new Date(start + index * DAY_MS);
    const key = `${date.getUTCFullYear()}-${date.getUTCMonth()}`;
    const month = monthWidths.get(key);
    if (month) {
      month.width += dayWidth;
    } else {
      monthWidths.set(key, {
        label: MONTH_FORMATTER.format(date),
        width: dayWidth,
      });
    }
  }

  const weekendOffsets: number[] = [];
  if (scale === "week") {
    for (let index = 0; index < dayCount; index += 1) {
      const weekday = new Date(start + index * DAY_MS).getUTCDay();
      if (weekday === 0 || weekday === 6) {
        weekendOffsets.push(index);
      }
    }
  }

  return (
    <div className="tl workspace-timeline">
      <div className="tl-left">
        <div className="tl-head">Task</div>
        <TimelineTaskList
          conflictIds={conflictIds}
          employeesById={employeesById}
          rows={rows}
        />
      </div>
      <div className="tl-right" ref={viewportRef}>
        <div className="tl-head" style={{ width }}>
          <div className="tl-months">
            {[...monthWidths.entries()].map(([key, month]) => (
              <div key={key} style={{ width: month.width }}>
                <span>{month.label}</span>
              </div>
            ))}
          </div>
          <div className="tl-days">
            {dateTicks.map((date) => {
              const offset = dayDiff(from, date.toISOString().slice(0, 10));
              const tickDays = Math.min(tickInterval, dayCount - offset);
              return (
                <div
                  className={offset === today ? "today" : undefined}
                  key={date.toISOString()}
                  style={{ width: dayWidth * tickDays }}
                >
                  {scale === "week" && dayWidth * tickDays >= 44
                    ? WEEK_DAY_FORMATTER.format(date)
                    : DAY_FORMATTER.format(date)}
                </div>
              );
            })}
          </div>
        </div>
        <div
          className="tl-grid"
          style={{ height: rows.length * ROW_HEIGHT, width }}
        >
          {weekendOffsets.map((offset) => (
            <div
              className="tl-we"
              key={`we-${offset}`}
              style={{ left: offset * dayWidth, width: dayWidth }}
            />
          ))}
          {dateTicks.map((date) => (
            <div
              className="tl-gl"
              key={date.toISOString()}
              style={{
                left: dayDiff(from, date.toISOString().slice(0, 10)) * dayWidth,
              }}
            />
          ))}
          {today >= 0 && today < dayCount ? (
            <div className="tl-today" style={{ left: today * dayWidth }} />
          ) : null}
          {arrows.length > 0 ? (
            <svg
              aria-hidden="true"
              className="tl-deps"
              height={rows.length * ROW_HEIGHT}
              width={width}
            >
              <defs>
                {ARROW_MARKERS.map((variant) => (
                  <marker
                    className={`tl-dep-head ${variant}`}
                    id={`${idPrefix}-head-${variant}`}
                    key={variant}
                    markerHeight="8"
                    markerUnits="userSpaceOnUse"
                    markerWidth="8"
                    orient="auto"
                    refX="7"
                    refY="4"
                  >
                    <path d="M 0 0 L 8 4 L 0 8 z" />
                  </marker>
                ))}
              </defs>
              {arrows.map((arrow) => {
                const active =
                  activeId === arrow.blockerId || activeId === arrow.taskId;
                let marker = "base";
                if (arrow.conflict) {
                  marker = "conflict";
                } else if (active) {
                  marker = "active";
                }
                return (
                  <path
                    className={`tl-dep${arrow.conflict ? " conflict" : ""}${arrow.cyclic ? " cyclic" : ""}${active ? " active" : ""}`}
                    d={arrow.path}
                    key={arrow.id}
                    markerEnd={`url(#${idPrefix}-head-${marker})`}
                  />
                );
              })}
            </svg>
          ) : null}
          {rows.map((row, index) => {
            const top = index * ROW_HEIGHT;
            if (row.type === "group") {
              return (
                <div className="tl-rowbg g" key={row.key} style={{ top }} />
              );
            }
            if (row.type === "milestones") {
              return (
                <TimelineMilestoneRow
                  dayCount={dayCount}
                  dayWidth={dayWidth}
                  from={from}
                  key={row.key}
                  lanes={row.lanes}
                  onMove={onMoveMilestone}
                  top={top}
                />
              );
            }
            const { task } = row;
            const detail = details.get(task.id);
            return (
              <div className="tl-rowbg" key={task.id} style={{ top }}>
                <TimelineBar
                  conflict={detail?.conflict ?? false}
                  dayCount={dayCount}
                  dayWidth={dayWidth}
                  describedBy={
                    detail?.description ? descriptionId(task.id) : undefined
                  }
                  editable={editableIds.has(task.id)}
                  from={from}
                  onActivate={setActiveId}
                  onMove={onMove}
                  task={task}
                />
                {detail?.description ? (
                  <span className="sr-only" id={descriptionId(task.id)}>
                    {detail.description}
                  </span>
                ) : null}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

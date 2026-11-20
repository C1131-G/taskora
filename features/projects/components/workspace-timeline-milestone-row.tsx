/* eslint-disable shadcn/no-unknown-classes, shadcn/no-inline-styles */

import { TimelineMilestoneMarker } from "@/features/projects/components/workspace-timeline-milestone";
import type { MilestoneRecord } from "@/features/projects/milestone-dates";
import type { TimelineMilestoneLane } from "@/features/projects/types/workspace-timeline-types";
import { dayDiff } from "@/features/tasks/task-dates";

// One label per milestone date, limited to the room before the next diamond so
// labels never overlap; cramped ones show only the diamond.
const milestoneLabels = (
  lanes: readonly TimelineMilestoneLane[],
  from: string,
  dayWidth: number,
  dayCount: number
) => {
  const namesByX = new Map<number, string[]>();
  for (const lane of lanes) {
    for (const { dueDate, name } of lane.allMilestones) {
      if (!dueDate) {
        continue;
      }
      const x = dayDiff(from, dueDate) * dayWidth + dayWidth / 2;
      if (x >= 0 && x < dayCount * dayWidth) {
        namesByX.set(x, [...(namesByX.get(x) ?? []), name]);
      }
    }
  }
  const points = [...namesByX.entries()].toSorted(
    ([left], [right]) => left - right
  );
  return points.flatMap(([x, names], index) => {
    const next = points[index + 1];
    const room = (next ? next[0] : Number.POSITIVE_INFINITY) - x - 24;
    if (room < 28) {
      return [];
    }
    const [first = "", ...rest] = names;
    return [
      {
        id: `${x}`,
        left: x + 12,
        maxWidth: Number.isFinite(room) ? Math.round(room) : 220,
        text: rest.length > 0 ? `${first} +${rest.length}` : first,
      },
    ];
  });
};

// Every project's milestones on a single row, so the chart has one lane for them.
export const TimelineMilestoneRow = ({
  dayCount,
  dayWidth,
  from,
  lanes,
  onMove,
  top,
}: {
  readonly dayCount: number;
  readonly dayWidth: number;
  readonly from: string;
  readonly lanes: readonly TimelineMilestoneLane[];
  readonly onMove: (
    lane: TimelineMilestoneLane,
    milestone: MilestoneRecord,
    dueDate: string
  ) => void;
  readonly top: number;
}) => (
  <div className="tl-rowbg g" style={{ top }}>
    {lanes.flatMap((lane) =>
      lane.allMilestones.map((milestone) => (
        <TimelineMilestoneMarker
          dayCount={dayCount}
          dayWidth={dayWidth}
          from={from}
          key={milestone.id}
          lane={lane}
          milestone={milestone}
          onMove={onMove}
        />
      ))
    )}
    {milestoneLabels(lanes, from, dayWidth, dayCount).map(
      ({ id, left, maxWidth, text }) => (
        <span
          aria-hidden="true"
          className="ms-l"
          key={id}
          style={{ left, maxWidth }}
        >
          {text}
        </span>
      )
    )}
  </div>
);

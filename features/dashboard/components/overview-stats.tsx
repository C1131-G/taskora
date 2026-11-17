/* eslint-disable shadcn/no-unknown-classes */

import { SkeletonBone } from "@/components/workspace/skeleton-shapes";

interface OverviewTile {
  readonly label: string;
  readonly value: string;
  readonly detail: string;
}

const OverviewStatTiles = ({
  tiles,
}: {
  readonly tiles: readonly OverviewTile[];
}) => (
  <div className="stats ov-stats">
    {tiles.map(({ detail, label, value }) => (
      <div className="stat" key={label}>
        <span className="k">{label}</span>
        <span className="v">{value}</span>
        <span className="d">{detail}</span>
      </div>
    ))}
  </div>
);

const OverviewStats = ({
  completedProjects,
  completionRate,
  members,
  openTasks,
  projects,
  tasks,
}: {
  readonly completedProjects: number;
  readonly completionRate: number;
  readonly members: number;
  readonly openTasks: number;
  readonly projects: number;
  readonly tasks: number;
}) => (
  <OverviewStatTiles
    tiles={[
      {
        detail: `${completedProjects} completed`,
        label: "Projects",
        value: String(projects),
      },
      { detail: `${openTasks} open`, label: "Tasks", value: String(tasks) },
      {
        detail: "Across all projects",
        label: "Completion rate",
        value: `${completionRate}%`,
      },
      {
        detail: "Active team members",
        label: "Members",
        value: String(members),
      },
    ]}
  />
);

// Labels stay; the numbers, and details that carry numbers, are bones.
const OverviewStatsSkeleton = () => (
  <div className="stats ov-stats">
    {(
      [
        ["Projects", undefined],
        ["Tasks", undefined],
        ["Completion rate", "Across all projects"],
        ["Members", "Active team members"],
      ] as const
    ).map(([label, detail]) => (
      <div className="stat" key={label}>
        <span className="k">{label}</span>
        <span className="v">
          <SkeletonBone shape="line" width="2ch" />
        </span>
        <span className="d">
          {detail ?? <SkeletonBone shape="line" width="6em" />}
        </span>
      </div>
    ))}
  </div>
);

export { OverviewStats, OverviewStatsSkeleton };

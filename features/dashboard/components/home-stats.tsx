/* eslint-disable shadcn/no-unknown-classes, shadcn/no-inline-styles */

import Link from "next/link";

import { SkeletonBone } from "@/components/workspace/skeleton-shapes";
import { SkeletonRegion } from "@/components/workspace/skelter-surface";

const HomeStats = ({
  activeProjects,
  atRisk,
  openTasks,
  assignedTasks,
  completed,
  overdue,
}: {
  readonly activeProjects: number;
  readonly atRisk: number;
  readonly openTasks: number;
  readonly assignedTasks: number;
  readonly completed: number;
  readonly overdue: number;
}) => (
  <div className="stats" style={{ marginBottom: 16 }}>
    <Link className="stat" href="/projects">
      <span className="k">Active projects</span>
      <span className="v">{activeProjects}</span>
      <span className="d">{atRisk} at risk</span>
    </Link>
    <Link className="stat" href="/tasks">
      <span className="k">Open tasks</span>
      <span className="v">{openTasks}</span>
      <span className="d">{assignedTasks} assigned to you</span>
    </Link>
    <Link className="stat stat-done" href="/tasks?status=done">
      <span className="k">Completed</span>
      <span className="v">{completed}</span>
      <span className="stat-chip">this week</span>
    </Link>
    <Link
      className={`stat stat-overdue${overdue > 0 ? " alert" : ""}`}
      href="/tasks?overdue=true"
    >
      <span className="k">Overdue</span>
      <span className="v">{overdue}</span>
      <span className="stat-chip">
        {overdue > 0 ? "need attention" : "all on track"}
      </span>
    </Link>
  </div>
);

// Mirrors HomeStats: the tile labels and chips are static, the numbers are data.
const HomeStatsSkeleton = () => (
  <SkeletonRegion label="Loading workspace totals…">
    <div className="stats" style={{ marginBottom: 16 }}>
      <div className="stat">
        <span className="k">Active projects</span>
        <span className="v">
          <SkeletonBone shape="line" width="1.5ch" />
        </span>
        <span className="d">
          <SkeletonBone shape="line" width="5em" />
        </span>
      </div>
      <div className="stat">
        <span className="k">Open tasks</span>
        <span className="v">
          <SkeletonBone shape="line" width="2ch" />
        </span>
        <span className="d">
          <SkeletonBone shape="line" width="8em" />
        </span>
      </div>
      <div className="stat stat-done">
        <span className="k">Completed</span>
        <span className="v">
          <SkeletonBone shape="line" width="1.5ch" />
        </span>
        <span className="stat-chip">this week</span>
      </div>
      <div className="stat stat-overdue">
        <span className="k">Overdue</span>
        <span className="v">
          <SkeletonBone shape="line" width="1.5ch" />
        </span>
        <span className="stat-chip">
          <SkeletonBone shape="line" width="7em" />
        </span>
      </div>
    </div>
  </SkeletonRegion>
);

export { HomeStats, HomeStatsSkeleton };

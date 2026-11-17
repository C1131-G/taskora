/* eslint-disable shadcn/no-unknown-classes */

import { Pulse } from "@phosphor-icons/react/dist/ssr";
import Link from "next/link";

import { EmptyState } from "@/components/workspace/empty-state";
import { LocalTime } from "@/components/workspace/local-time";
import {
  SKELETON_KEYS,
  SkeletonBone,
} from "@/components/workspace/skeleton-shapes";
import { SkeletonRegion } from "@/components/workspace/skelter-surface";
import type { ActivityEntry } from "@/src/server/activity/activity-management";

const RecentActivityPanel = ({
  activities,
}: {
  readonly activities: readonly ActivityEntry[];
}) => (
  <section className="panel">
    <div className="panel-h">
      <h2>Recent activity</h2>
      <Link className="btn btn-sm btn-ghost" href="/activity">
        View all
      </Link>
    </div>
    <div className="panel-b feed lined home-activity-list">
      {activities.length ? (
        activities.map((activity) => (
          <article className="mini home-activity-row" key={activity.id}>
            <span aria-hidden="true" className="av">
              {activity.actorName.slice(0, 1)}
            </span>
            <div className="home-activity-copy">
              <strong>{activity.actorName}</strong>
              <p className="muted">{activity.action.replaceAll("_", " ")}</p>
            </div>
            <LocalTime
              className="muted home-activity-time"
              format="relative"
              value={activity.createdAt}
            />
          </article>
        ))
      ) : (
        <EmptyState
          description="Changes to projects and tasks show up here as they happen."
          icon={Pulse}
          size="compact"
          title="No recent activity"
        />
      )}
    </div>
  </section>
);

// Mirrors RecentActivityPanel with a few rows of the real row height.
const RecentActivityPanelSkeleton = () => (
  <section className="panel">
    <div className="panel-h">
      <h2>Recent activity</h2>
      <span aria-hidden="true" className="btn btn-sm btn-ghost">
        View all
      </span>
    </div>
    <SkeletonRegion label="Loading activity…">
      <div className="panel-b feed lined home-activity-list">
        {SKELETON_KEYS.slice(0, 4).map((key) => (
          <div className="mini home-activity-row" key={key}>
            <span className="av" />
            <div className="home-activity-copy">
              <strong>
                <SkeletonBone shape="line" width="7em" />
              </strong>
              <p className="muted">
                <SkeletonBone shape="line" width="9em" />
              </p>
            </div>
            <span className="muted home-activity-time">
              <SkeletonBone shape="line" width="6em" />
            </span>
          </div>
        ))}
      </div>
    </SkeletonRegion>
  </section>
);

export { RecentActivityPanel, RecentActivityPanelSkeleton };

/* eslint-disable shadcn/no-unknown-classes */

import { Pulse } from "@phosphor-icons/react/dist/ssr";

import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { EmptyState } from "@/components/workspace/empty-state";
import { ErrorToast } from "@/components/workspace/error-toast";
import {
  SKELETON_KEYS,
  SkeletonBone,
} from "@/components/workspace/skeleton-shapes";
import { SkeletonRegion } from "@/components/workspace/skelter-surface";
import { WorkspaceCombobox } from "@/components/workspace/workspace-combobox";
import { listActivity } from "@/features/activity/activity-queries";
import { ActivityFeedList } from "@/features/activity/components/activity-feed-list";

const ActivityFeed = async () => {
  const result = await listActivity({ limit: 100 });
  if (!result.ok) {
    return <ErrorToast message="Activity could not be loaded." />;
  }

  const entries = result.data;

  return entries.length ? (
    <ActivityFeedList entries={entries.slice(0, 100)} />
  ) : (
    <EmptyState
      description="Changes to projects and tasks will appear here."
      headingLevel={2}
      icon={Pulse}
      size="panel"
      title="No activity yet"
    />
  );
};

const ACTIVITY_SKELETON_ROWS = SKELETON_KEYS.slice(0, 5);

// Mirrors ActivityFeedList: the filter row and day heading are static; only
// the entries are data.
const ActivityFeedSkeleton = () => (
  <SkeletonRegion label="Loading activity…">
    <section className="stack">
      <div className="row activity-filters">
        <Tabs value="all">
          <div className="activity-tabs">
            <TabsList aria-label="Filter activity">
              <TabsTrigger aria-controls={undefined} value="all">
                All
              </TabsTrigger>
              <TabsTrigger aria-controls={undefined} value="status">
                Status changes
              </TabsTrigger>
              <TabsTrigger aria-controls={undefined} value="comments">
                Comments
              </TabsTrigger>
              <TabsTrigger aria-controls={undefined} value="projects">
                Projects
              </TabsTrigger>
            </TabsList>
          </div>
        </Tabs>
        <WorkspaceCombobox
          ariaLabel="Filter by person"
          className="min-w-[130px]"
          defaultValue="everyone"
          emptyMessage="No people found."
          id="activity-person-skeleton"
          options={[{ label: "Everyone", value: "everyone" }]}
          placeholder="Everyone"
          searchPlaceholder="Search people"
        />
      </div>
      <section className="panel">
        <div className="panel-h">
          <h2>Today</h2>
        </div>
        <div className="panel-b feed lined">
          {ACTIVITY_SKELETON_ROWS.map((key) => (
            <article className="row activity-entry" key={key}>
              <span aria-hidden="true" className="av" />
              <p className="activity-copy grow">
                <SkeletonBone shape="line" width="48ch" />
              </p>
              <span className="faint">
                <SkeletonBone shape="line" width="6ch" />
              </span>
            </article>
          ))}
        </div>
      </section>
    </section>
  </SkeletonRegion>
);

export { ActivityFeed, ActivityFeedSkeleton };

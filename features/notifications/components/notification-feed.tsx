/* eslint-disable shadcn/no-restyle -- Skeletons reuse the real workspace button and input classes. */
/* eslint-disable shadcn/no-unknown-classes -- Workspace classes are defined in apps/web/app/workspace-styles. */

import { Check, GearSix } from "@phosphor-icons/react/dist/ssr";

import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  SKELETON_KEYS,
  SkeletonBone,
} from "@/components/workspace/skeleton-shapes";
import { SkeletonRegion } from "@/components/workspace/skelter-surface";
import { WorkspaceButton } from "@/components/workspace/workspace-button";
import { NotificationList } from "@/features/notifications/components/notification-list";
import { listNotificationInbox } from "@/features/notifications/notifications-queries";

const NotificationFeed = async () => {
  const result = await listNotificationInbox({ limit: 100, unreadOnly: false });
  if (!result.ok) {
    throw new Error("Notifications could not be loaded.");
  }
  return (
    <NotificationList
      items={result.data.items}
      unreadCount={result.data.unreadCount}
    />
  );
};

const NOTIFICATION_ROWS = SKELETON_KEYS.slice(0, 5);

// Mirrors NotificationList: title, filters and the day heading are static;
// only the unread count and the rows are data. It draws the populated list, as
// most people have notifications; the empty state is not a loading state.
const NotificationFeedSkeleton = () => (
  <section className="notification-page">
    <header className="notification-page-heading">
      <div>
        <h1>Notifications</h1>
        <p>Updates on tasks and projects you follow.</p>
      </div>
      <div aria-hidden="true" className="notification-page-actions" inert>
        <Tabs value="all">
          <TabsList aria-label="Filter notifications">
            <TabsTrigger aria-controls={undefined} value="all">
              All
            </TabsTrigger>
            <TabsTrigger aria-controls={undefined} value="unread">
              Unread
            </TabsTrigger>
          </TabsList>
        </Tabs>
        <WorkspaceButton className="btn btn-secondary" type="button">
          <Check aria-hidden="true" size={15} />
          Mark all as read
        </WorkspaceButton>
        <WorkspaceButton type="button" variant="ghost">
          <GearSix aria-hidden="true" size={16} />
        </WorkspaceButton>
      </div>
    </header>
    <SkeletonRegion label="Loading notifications…">
      <section className="notification-date-group">
        <h2>Today</h2>
        <div className="panel notification-card">
          {NOTIFICATION_ROWS.map((key) => (
            <article className="notification-row" key={key}>
              <span aria-hidden="true" className="notification-row-icon">
                <SkeletonBone shape="avatar" />
              </span>
              <div className="notification-row-copy">
                <p className="notification-row-title">
                  <SkeletonBone shape="line" width="40ch" />
                </p>
                <p className="notification-row-snippet">
                  <SkeletonBone shape="line" width="56ch" />
                </p>
                <p className="notification-row-meta">
                  <SkeletonBone shape="line" width="20ch" />
                </p>
              </div>
            </article>
          ))}
        </div>
      </section>
    </SkeletonRegion>
  </section>
);

export { NotificationFeed, NotificationFeedSkeleton };

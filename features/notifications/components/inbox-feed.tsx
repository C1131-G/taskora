/* eslint-disable shadcn/no-unknown-classes, shadcn/no-restyle -- Workspace classes are defined in apps/web/app/workspace-styles. */

import { Switch } from "@/components/ui/switch";
import {
  SKELETON_KEYS,
  SkeletonBone,
} from "@/components/workspace/skeleton-shapes";
import { SkeletonRegion } from "@/components/workspace/skelter-surface";
import { InboxWorkspace } from "@/features/notifications/components/inbox-workspace";
import { FILTERS } from "@/features/notifications/inbox-format";
import { listNotificationInbox } from "@/features/notifications/notifications-queries";

const InboxFeed = async () => {
  const result = await listNotificationInbox({ limit: 100, unreadOnly: false });
  if (!result.ok) {
    throw new Error("Inbox could not be loaded.");
  }
  return (
    <InboxWorkspace
      items={result.data.items}
      unreadCount={result.data.unreadCount}
    />
  );
};

// InboxWorkspace's markup: header text, filter labels and switch are static;
// counts, rows and the selected notification are bones.
const InboxFeedSkeleton = () => (
  <SkeletonRegion label="Loading inbox…">
    <section className="inbox-workspace">
      <div className="panel inbox-list-panel">
        <header className="inbox-head">
          <div className="inbox-head-title">
            <h2>
              <SkeletonBone shape="line" width="7em" />
            </h2>
            <span className="inbox-head-count">
              <SkeletonBone shape="line" width="5em" />
            </span>
          </div>
          <div className="inbox-head-actions">
            <span className="inbox-unread-toggle">
              <Switch
                checked={false}
                className="inbox-unread-switch"
                size="sm"
              />
              Unread only
            </span>
          </div>
        </header>
        <nav className="inbox-tabs">
          {FILTERS.map(({ id, label }) => (
            <span className="inbox-tab" key={id}>
              {label}
              <span className="inbox-tab-count">0</span>
            </span>
          ))}
        </nav>
        <div className="inbox-items">
          <section className="inbox-group">
            <h3 className="inbox-group-label">
              <SkeletonBone shape="line" width="5em" />
            </h3>
            <ul className="inbox-group-list">
              {SKELETON_KEYS.slice(0, 4).map((key) => (
                <li className="inbox-item read" key={key}>
                  <div data-inbox-item-select="">
                    <span className="inbox-avatar-wrap">
                      <span className="inbox-system-icon" />
                    </span>
                    <span className="inbox-item-copy">
                      <span className="inbox-item-title">
                        <SkeletonBone shape="line" width="80%" />
                      </span>
                      <span className="inbox-item-meta">
                        <SkeletonBone shape="line" width="8em" />
                      </span>
                    </span>
                  </div>
                </li>
              ))}
            </ul>
          </section>
        </div>
      </div>
      <aside className="panel inbox-detail">
        <div className="inbox-detail-body">
          <SkeletonBone shape="line" width="40%" />
          <h3>
            <SkeletonBone shape="line" width="80%" />
          </h3>
          <SkeletonBone shape="line" width="60%" />
        </div>
      </aside>
    </section>
  </SkeletonRegion>
);

export { InboxFeed, InboxFeedSkeleton };

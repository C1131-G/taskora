/* eslint-disable shadcn/no-unknown-classes -- Portal pages reuse the workspace stylesheet classes. */

import { Bell } from "@phosphor-icons/react/dist/ssr";

import {
  SKELETON_KEYS,
  SkeletonBone,
} from "@/components/workspace/skeleton-shapes";
import {
  SkeletonKeep,
  SkelterSurface,
} from "@/components/workspace/skelter-surface";
import { PortalNotificationList } from "@/features/portal/components/portal-notification-list";
import { getPortalCompany } from "@/features/portal/portal-company";
import { listPortalNotifications } from "@/features/portal/portal-queries";

const PortalNotifications = async () => {
  const [result, company] = await Promise.all([
    listPortalNotifications({}),
    getPortalCompany(),
  ]);
  if (!result.ok) {
    throw new Error("Notifications could not be loaded.");
  }
  const { items, unreadCount } = result.data;
  return (
    <>
      <div className="ph">
        <div>
          <h1>Notifications</h1>
          <p>
            {unreadCount > 0
              ? `${unreadCount} unread`
              : "You are all caught up."}
          </p>
        </div>
      </div>
      {items.length === 0 ? (
        <div className="panel empty-state">
          <span aria-hidden="true" className="glyph">
            <Bell size={22} />
          </span>
          <h2 className="es-h">No notifications yet</h2>
          <p>
            We will let you know here when the team replies or the status of one
            of your bugs changes.
          </p>
        </div>
      ) : (
        <PortalNotificationList
          isPreview={Boolean(company?.preview)}
          items={items}
          unreadCount={unreadCount}
        />
      )}
    </>
  );
};

const PortalNotificationsSkeleton = () => (
  <SkelterSurface label="Loading notifications">
    <div className="ph">
      <div>
        <SkeletonKeep>
          <h1>Notifications</h1>
        </SkeletonKeep>
        <p>
          <SkeletonBone shape="short" />
        </p>
      </div>
    </div>
    <section className="panel">
      <div className="panel-h portal-notif-bar">
        <SkeletonBone shape="short" />
        <div className="acts">
          <SkeletonBone shape="control" />
        </div>
      </div>
      <ul className="portal-notifs">
        {SKELETON_KEYS.slice(0, 4).map((key) => (
          <li className="portal-notif" key={key}>
            <span className="portal-notif-main">
              <span className="portal-notif-text">
                <SkeletonBone />
              </span>
              <SkeletonBone shape="short" />
            </span>
          </li>
        ))}
      </ul>
    </section>
  </SkelterSurface>
);

export { PortalNotifications, PortalNotificationsSkeleton };

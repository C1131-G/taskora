/* eslint-disable shadcn/no-unknown-classes, shadcn/no-restyle */

"use client";

import { Bell, Checks, EnvelopeOpen, Tray } from "@phosphor-icons/react";
import { useSearchParams } from "next/navigation";
import { useMemo, useState } from "react";

import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Switch } from "@/components/ui/switch";
import { EmptyState } from "@/components/workspace/empty-state";
import { WorkspaceButton } from "@/components/workspace/workspace-button";
import { InboxDetailContent } from "@/features/notifications/components/inbox-detail-content";
import {
  getTypeLabel,
  InboxTypeIcon,
} from "@/features/notifications/components/inbox-type-icon";
import { useInboxReadState } from "@/features/notifications/hooks/use-inbox-read-state";
import {
  DATE_FORMATTER,
  FILTERS,
  formatRelativeTime,
  getDayGroup,
  getInitials,
  typeMatchesFilter,
} from "@/features/notifications/inbox-format";
import type { NotificationItem } from "@/src/server/notifications/contracts";

const updateUrl = (key: string, value: string | null) => {
  const url = new URL(window.location.href);
  if (value) {
    url.searchParams.set(key, value);
  } else {
    url.searchParams.delete(key);
  }
  window.history.pushState(null, "", `${url.pathname}${url.search}${url.hash}`);
};

export const InboxWorkspace = ({
  items,
  unreadCount,
}: {
  readonly items: readonly NotificationItem[];
  readonly unreadCount: number;
}) => {
  const searchParams = useSearchParams();
  const filterValue = searchParams.get("type");
  const filter = FILTERS.find(({ id }) => id === filterValue)?.id ?? "all";
  const unreadOnly = searchParams.get("unread") === "1";
  const selectedId = searchParams.get("notification") ?? items[0]?.id ?? null;
  const [mobileDetailOpen, setMobileDetailOpen] = useState(false);
  const { markAllRead, markRead, pending, shownItems, shownUnread } =
    useInboxReadState(items, unreadCount);
  const visibleItems = useMemo(
    () =>
      shownItems.filter(
        (notification) =>
          typeMatchesFilter(notification.type, filter) &&
          (!unreadOnly || notification.readAt === null)
      ),
    [filter, shownItems, unreadOnly]
  );
  const selectedItem = visibleItems.find(({ id }) => id === selectedId) ?? null;
  const counts = useMemo(
    () =>
      new Map(
        FILTERS.map(({ id }) => [
          id,
          items.filter((notification) =>
            typeMatchesFilter(notification.type, id)
          ).length,
        ])
      ),
    [items]
  );
  const groups = useMemo(() => {
    const byDay = new Map<string, NotificationItem[]>();
    for (const notification of visibleItems) {
      const label = getDayGroup(notification.createdAt);
      byDay.set(label, [...(byDay.get(label) ?? []), notification]);
    }
    return [...byDay.entries()];
  }, [visibleItems]);

  const selectNotification = (notificationId: string) => {
    updateUrl("notification", notificationId);
    if (window.matchMedia("(max-width: 900px)").matches) {
      setMobileDetailOpen(true);
    }
  };

  return (
    <section aria-label="Inbox notifications" className="inbox-workspace">
      <div className="panel inbox-list-panel">
        <header className="inbox-head">
          <div className="inbox-head-title">
            <h2>
              {shownUnread > 0 ? `${shownUnread} unread` : "All caught up"}
            </h2>
            <span className="inbox-head-count">
              {visibleItems.length} shown
            </span>
          </div>
          <div className="inbox-head-actions">
            <label className="inbox-unread-toggle" htmlFor="inbox-unread-only">
              <Switch
                checked={unreadOnly}
                className="inbox-unread-switch"
                id="inbox-unread-only"
                onCheckedChange={(checked) =>
                  updateUrl("unread", checked === true ? "1" : null)
                }
                size="sm"
              />
              Unread only
            </label>
            {shownUnread > 0 ? (
              <WorkspaceButton
                aria-label="Mark all as read"
                className="inbox-mark-all"
                disabled={pending}
                onClick={markAllRead}
                size="sm"
                type="button"
                variant="ghost"
              >
                <Checks aria-hidden="true" />
                Mark all read
              </WorkspaceButton>
            ) : null}
          </div>
        </header>
        <div
          aria-label="Filter inbox by type"
          className="inbox-tabs"
          role="group"
        >
          {FILTERS.map(({ id, label }) => (
            <button
              aria-pressed={filter === id}
              className="inbox-tab"
              key={id}
              onClick={() => updateUrl("type", id === "all" ? null : id)}
              type="button"
            >
              {label}
              <span className="inbox-tab-count">{counts.get(id) ?? 0}</span>
            </button>
          ))}
        </div>
        {visibleItems.length > 0 ? (
          <div className="inbox-items">
            {groups.map(([label, group]) => (
              <section aria-label={label} className="inbox-group" key={label}>
                <h3 className="inbox-group-label">{label}</h3>
                <ul className="inbox-group-list">
                  {group.map((notification) => {
                    const isSelected = selectedItem?.id === notification.id;
                    return (
                      <li
                        className={`inbox-item${notification.readAt ? " read" : " unread"}${isSelected ? " selected" : ""}`}
                        key={notification.id}
                      >
                        <button
                          aria-pressed={isSelected}
                          data-inbox-item-select=""
                          onClick={() => selectNotification(notification.id)}
                          type="button"
                        >
                          <span className="inbox-avatar-wrap">
                            {notification.actorName ? (
                              <Avatar className="inbox-avatar">
                                <AvatarFallback>
                                  {getInitials(notification.actorName)}
                                </AvatarFallback>
                              </Avatar>
                            ) : (
                              <span
                                aria-hidden="true"
                                className="inbox-system-icon"
                              >
                                <Bell />
                              </span>
                            )}
                            <span
                              className={`inbox-type-badge type-${notification.type}`}
                              title={getTypeLabel(notification.type)}
                            >
                              <InboxTypeIcon type={notification.type} />
                            </span>
                          </span>
                          <span className="inbox-item-copy">
                            <span className="inbox-item-title">
                              {notification.text}
                            </span>
                            {notification.snippet ? (
                              <span className="inbox-item-snippet">
                                {notification.snippet}
                              </span>
                            ) : null}
                            <span className="inbox-item-meta">
                              {notification.projectName ? (
                                <span className="inbox-item-project">
                                  {notification.projectName}
                                </span>
                              ) : null}
                              <time
                                className="inbox-item-time"
                                dateTime={notification.createdAt}
                                title={DATE_FORMATTER.format(
                                  new Date(notification.createdAt)
                                )}
                              >
                                {formatRelativeTime(notification.createdAt)}
                              </time>
                            </span>
                          </span>
                          {notification.readAt === null ? (
                            <span
                              className="inbox-unread-dot"
                              role="img"
                              aria-label="Unread"
                            />
                          ) : null}
                        </button>
                        {notification.readAt === null ? (
                          <WorkspaceButton
                            aria-label={`Mark as read: ${notification.text}`}
                            className="inbox-item-read"
                            disabled={pending}
                            onClick={() => markRead(notification.id)}
                            size="icon-sm"
                            type="button"
                            variant="ghost"
                          >
                            <EnvelopeOpen aria-hidden="true" />
                          </WorkspaceButton>
                        ) : null}
                      </li>
                    );
                  })}
                </ul>
              </section>
            ))}
          </div>
        ) : (
          <EmptyState
            action={
              filter !== "all" || unreadOnly ? (
                <WorkspaceButton
                  className="btn btn-secondary btn-sm"
                  onClick={() => {
                    updateUrl("type", null);
                    updateUrl("unread", null);
                  }}
                  type="button"
                >
                  Clear filters
                </WorkspaceButton>
              ) : null
            }
            description="New mentions, assignments and updates land here."
            icon={Tray}
            title="No notifications match this filter"
          />
        )}
      </div>
      <aside aria-label="Selected notification" className="panel inbox-detail">
        <InboxDetailContent
          item={selectedItem}
          onMarkRead={markRead}
          pending={pending}
        />
      </aside>
      <Sheet onOpenChange={setMobileDetailOpen} open={mobileDetailOpen}>
        <SheetContent
          className="workspace-app inbox-mobile-detail-sheet"
          data-workspace-sheet=""
          side="bottom"
          showCloseButton
        >
          <SheetHeader className="inbox-mobile-detail-header">
            <SheetTitle>Notification details</SheetTitle>
            <SheetDescription>
              Review the update and open its project.
            </SheetDescription>
          </SheetHeader>
          <InboxDetailContent
            item={selectedItem}
            onMarkRead={markRead}
            pending={pending}
          />
        </SheetContent>
      </Sheet>
    </section>
  );
};

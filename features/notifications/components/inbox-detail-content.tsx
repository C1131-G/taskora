/* eslint-disable shadcn/no-unknown-classes, shadcn/no-restyle */

import { ArrowUpRight, EnvelopeOpen } from "@phosphor-icons/react";
import Link from "next/link";

import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { WorkspaceButton } from "@/components/workspace/workspace-button";
import { InboxTypeIcon } from "@/features/notifications/components/inbox-type-icon";
import {
  DATE_FORMATTER,
  formatRelativeTime,
  getInitials,
  getTypeLabel,
} from "@/features/notifications/inbox-format";
import type { NotificationItem } from "@/src/server/notifications/contracts";

const InboxDetailContent = ({
  item,
  pending,
  onMarkRead,
}: {
  readonly item: NotificationItem | null;
  readonly pending: boolean;
  readonly onMarkRead: (notificationId: string) => void;
}) =>
  item ? (
    <article className="inbox-detail-body">
      <div className="inbox-detail-top">
        <span className={`inbox-detail-type type-${item.type}`}>
          <InboxTypeIcon type={item.type} />
          {getTypeLabel(item.type)}
        </span>
        <time
          dateTime={item.createdAt}
          title={DATE_FORMATTER.format(new Date(item.createdAt))}
        >
          {DATE_FORMATTER.format(new Date(item.createdAt))} ·{" "}
          {formatRelativeTime(item.createdAt)}
        </time>
      </div>
      <h3>{item.text}</h3>
      {item.actorName ? (
        <div className="inbox-detail-actor">
          <Avatar className="inbox-avatar">
            <AvatarFallback>{getInitials(item.actorName)}</AvatarFallback>
          </Avatar>
          <span>
            <strong>{item.actorName}</strong>
            {item.projectName ? ` in ${item.projectName}` : null}
          </span>
        </div>
      ) : null}
      {item.snippet ? (
        <blockquote className="inbox-detail-quote">{item.snippet}</blockquote>
      ) : null}
      <div className="inbox-detail-actions">
        {item.projectName && item.projectId ? (
          <Link
            className="btn btn-primary"
            href={`/projects/${item.projectId}?view=board`}
          >
            Open {item.projectName}
            <ArrowUpRight aria-hidden="true" />
          </Link>
        ) : null}
        {item.readAt === null ? (
          <WorkspaceButton
            disabled={pending}
            onClick={() => onMarkRead(item.id)}
            type="button"
            variant="secondary"
          >
            Mark as read
          </WorkspaceButton>
        ) : (
          <span className="inbox-detail-read">Read</span>
        )}
      </div>
    </article>
  ) : (
    <div className="inbox-detail-empty">
      <span aria-hidden="true" className="inbox-detail-empty-icon">
        <EnvelopeOpen size={22} />
      </span>
      <h2>Select a notification</h2>
      <p>Choose a notification to review its details.</p>
    </div>
  );

export { InboxDetailContent };

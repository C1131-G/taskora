"use client";

import { useOptimistic, useTransition } from "react";
import { toast } from "sonner";

import {
  shownUnreadCount,
  withNotificationsRead,
} from "@/features/notifications/inbox-read-state";
import {
  markAllNotificationsReadAction,
  markNotificationReadAction,
} from "@/features/notifications/notifications-actions";
import type { NotificationItem } from "@/src/server/notifications/contracts";

// Marking read shows at once. The action's refresh brings the saved state;
// when it fails the optimistic read falls away and the error is shown.
const useInboxReadState = (
  items: readonly NotificationItem[],
  unreadCount: number
) => {
  const [pending, startTransition] = useTransition();
  const [shownItems, markShownRead] = useOptimistic(
    items,
    withNotificationsRead<NotificationItem>
  );

  const markRead = (notificationId: string) =>
    startTransition(async () => {
      markShownRead({ id: notificationId, readAt: new Date().toISOString() });
      try {
        const result = await markNotificationReadAction({
          idempotencyKey: crypto.randomUUID(),
          notificationId,
        });
        if (!result.ok) {
          toast.error(result.error.message);
        }
      } catch {
        toast.error("The notification could not be marked as read. Try again.");
      }
    });

  const markAllRead = () =>
    startTransition(async () => {
      markShownRead({ id: "all", readAt: new Date().toISOString() });
      try {
        const result = await markAllNotificationsReadAction({
          idempotencyKey: crypto.randomUUID(),
        });
        if (!result.ok) {
          toast.error(result.error.message);
        }
      } catch {
        toast.error("Notifications could not be marked as read. Try again.");
      }
    });

  return {
    markAllRead,
    markRead,
    pending,
    shownItems,
    shownUnread: shownUnreadCount(unreadCount, items, shownItems),
  };
};

export { useInboxReadState };

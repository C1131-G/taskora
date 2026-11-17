import { Effect } from "effect";
import { useRouter } from "expo-router";

import { WorkspaceErrorState } from "@/components/workspace/workspace-error-state";
import { WorkspaceTabShell } from "@/features/navigation/workspace-tabs";
import { InboxScreen } from "@/features/inbox/inbox-screen";
import { listInbox, type InboxItem } from "@/features/inbox/queries";
import { useApi, useApiQuery, useKeys } from "@/runtime/api-hooks";
import type { AppFailure } from "@/errors";
import type { InboxPage } from "@/features/inbox/queries";

const placeholderItem = (id: string, text: string, type: string): InboxItem => ({
  actorId: null,
  actorName: "Priya Raman",
  createdAt: "2026-10-24T09:15:00.000Z",
  id,
  projectId: null,
  projectName: "Website relaunch",
  readAt: null,
  snippet: null,
  taskId: null,
  text,
  type,
});

/** Typical-length rows so Skelter sizes its bones like real notifications. */
const PLACEHOLDER_INBOX_ITEMS: readonly InboxItem[] = [
  placeholderItem("placeholder-inbox-1", "Priya assigned you Update pricing page copy", "assignment"),
  placeholderItem("placeholder-inbox-2", "Marco commented on Fix checkout validation", "comment"),
  placeholderItem("placeholder-inbox-3", "Review requested on Homepage hero redesign", "status"),
];

export default function InboxRoute() {
  const api = useApi();
  const keys = useKeys();
  const router = useRouter();

  const program: Effect.Effect<InboxPage, AppFailure> =
    api === null ? Effect.succeed({ items: [], nextCursor: null, unreadCount: 0, unreadInboxCount: 0 }) : listInbox(api);

  const inbox = useApiQuery({ enabled: api !== null, program, queryKey: ["inbox"] });

  const isLoading = api === null || keys === null || inbox.isPending;
  if (inbox.error !== null) {
    return <WorkspaceErrorState failure={inbox.error} onRetry={() => void inbox.refetch()} />;
  }

  return (
    <WorkspaceTabShell>
      <InboxScreen
        api={api}
        isLoading={isLoading}
        items={inbox.data?.items ?? PLACEHOLDER_INBOX_ITEMS}
        keys={keys}
        onOpenTask={(taskId) => router.push(`/tasks/${taskId}`)}
      />
    </WorkspaceTabShell>
  );
}

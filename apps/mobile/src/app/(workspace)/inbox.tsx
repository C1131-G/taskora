import { Effect } from "effect";
import { useRouter } from "expo-router";

import { WorkspaceTabShell } from "@/features/navigation/workspace-tabs";
import { InboxScreen } from "@/features/inbox/inbox-screen";
import { flattenInboxPages, listInbox } from "@/features/inbox/queries";
import { useApi, useApiInfiniteQuery, useKeys } from "@/runtime/api-hooks";
import { inboxKeys } from "@/runtime/query-keys";

const EMPTY_PAGE = { items: [], nextCursor: null, unreadCount: 0, unreadInboxCount: 0 } as const;

export default function InboxRoute() {
  const api = useApi();
  const keys = useKeys();
  const router = useRouter();

  const inbox = useApiInfiniteQuery({
    enabled: api !== null,
    program: (cursor) => (api === null ? Effect.succeed(EMPTY_PAGE) : listInbox(api, { cursor })),
    queryKey: inboxKeys.list(),
  });
  const { fetchNextPage, hasNextPage, isFetchingNextPage, refetch } = inbox;

  return (
    <WorkspaceTabShell>
      <InboxScreen
        api={api}
        // Cached items stay on screen when a background refresh fails.
        failure={inbox.data === undefined ? inbox.error : null}
        hasNextPage={hasNextPage}
        isFetchingNextPage={isFetchingNextPage}
        isLoading={api === null || keys === null || inbox.isPending}
        items={inbox.data === undefined ? [] : flattenInboxPages(inbox.data.pages)}
        keys={keys}
        onLoadMore={() => void fetchNextPage()}
        onOpenTask={(taskId) => router.push(`/tasks/${taskId}`)}
        onRetry={() => void refetch()}
      />
    </WorkspaceTabShell>
  );
}

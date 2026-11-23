import { Effect } from "effect";
import { withSkeleton } from "react-zero-skeleton";
import { memo, useCallback, useRef, useState, type ReactNode } from "react";
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  View,
  type ListRenderItem,
} from "react-native";

import { WorkspaceChip } from "@/components/workspace/workspace-chip";
import { WorkspaceEmptyState } from "@/components/workspace/workspace-empty-state";
import { WorkspaceLoadingRegion } from "@/components/workspace/workspace-loading";
import { WorkspaceListGroup } from "@/components/workspace/workspace-list-row";
import { WorkspaceListScreen } from "@/components/workspace/workspace-screen";
import { useErrorToast } from "@/components/workspace/error-toast-context";
import { failureMessage, WorkspaceErrorState } from "@/components/workspace/workspace-error-state";
import type { AppFailure } from "@/errors";
import {
  markAllInboxRead,
  markInboxItemRead,
  splitInbox,
  type InboxItem,
} from "@/features/inbox/queries";
import { useApiMutation, type ApiContextValue, type KeysContextValue } from "@/runtime/api-hooks";
import { inboxKeys } from "@/runtime/query-keys";
import { useHapticFeedback } from "@/runtime/haptics-hooks";
import { useTheme } from "@/theme/theme-provider";
import { typeStyle } from "@/theme/type-scale";
import { radii, spacing, theme } from "@/theme/tokens.generated";

export interface InboxScreenProps {
  /** Null while the session restores; the screen then only renders its skeleton. */
  readonly api: ApiContextValue | null;
  /** Set only when there is nothing cached to show. */
  readonly failure?: AppFailure | null;
  /** More pages exist beyond `items`. */
  readonly hasNextPage?: boolean;
  readonly isFetchingNextPage?: boolean;
  readonly isLoading: boolean;
  readonly items: readonly InboxItem[];
  readonly keys: KeysContextValue | null;
  /** Fetches the next page; the screen calls it near the end of the list. */
  readonly onLoadMore?: () => void;
  readonly onOpenTask: (taskId: string) => void;
  readonly onRetry?: () => void;
}

const MARK_FAILED = "Could not update the inbox.";

const keyOfItem = (item: InboxItem): string => item.id;

const noop = (): void => undefined;

interface InboxRowProps {
  readonly id: string;
  readonly onPress: (id: string, taskId: string | null, unread: boolean) => void;
  readonly projectName: string | null;
  readonly taskId: string | null;
  readonly text: string;
  readonly type: string;
  readonly unread: boolean;
}

/** One notification card; takes primitives and one shared handler so memo holds. */
const InboxRow = memo(function InboxRow({ id, onPress, projectName, taskId, text, type, unread }: InboxRowProps) {
  const { isDark } = useTheme();
  const palette = isDark ? theme.dark : theme.light;
  const press = useCallback(() => onPress(id, taskId, unread), [id, onPress, taskId, unread]);

  return (
    <WorkspaceListGroup>
      <Pressable
        accessibilityLabel={`${unread ? "Unread" : "Read"}: ${text}`}
        accessibilityRole="button"
        onPress={press}
        style={({ pressed }) => [
          styles.item,
          { backgroundColor: pressed ? palette.surface2 : "transparent" },
        ]}
      >
        <View style={[styles.unreadDot, { backgroundColor: unread ? palette.accent : "transparent" }]} />
        <View style={styles.itemText}>
          <Text style={[typeStyle("md", { weight: unread ? 600 : 400 }), { color: palette.text }]}>{text}</Text>
          <Text style={[typeStyle("xs"), { color: palette.text3 }]}>
            {type}
            {projectName === null ? "" : ` · ${projectName}`}
          </Text>
        </View>
      </Pressable>
    </WorkspaceListGroup>
  );
});

/** Typical-length rows so Skelter sizes its bones like real notifications. */
const SKELETON_ROWS: readonly { readonly id: string; readonly text: string; readonly type: string }[] = [
  { id: "skeleton-inbox-1", text: "Priya assigned you Update pricing page copy", type: "assignment" },
  { id: "skeleton-inbox-2", text: "Marco commented on Fix checkout validation", type: "comment" },
  { id: "skeleton-inbox-3", text: "Review requested on Homepage hero redesign", type: "status" },
];

const SkeletonRows = ({ rows }: { readonly rows: typeof SKELETON_ROWS }) => (
  <>
    {rows.map((row) => (
      <InboxRow
        id={row.id}
        key={row.id}
        onPress={noop}
        projectName="Website relaunch"
        taskId={null}
        text={row.text}
        type={row.type}
        unread
      />
    ))}
  </>
);

const SkelterInboxRows = withSkeleton(SkeletonRows);

const NO_ITEMS: readonly InboxItem[] = [];

/** The inbox: All/Unread tabs, per-item read marks, a mark-all action and paging. */
export const InboxScreen = ({
  api,
  failure = null,
  hasNextPage = false,
  isFetchingNextPage = false,
  isLoading,
  items,
  keys,
  onLoadMore,
  onOpenTask,
  onRetry,
}: InboxScreenProps) => {
  const [tab, setTab] = useState<"all" | "unread">("all");
  const { isDark } = useTheme();
  const palette = isDark ? theme.dark : theme.light;
  const showError = useErrorToast();
  const haptic = useHapticFeedback();
  // The ref blocks a second press in the same frame; isPending disables the action.
  const markingAllRef = useRef(false);

  const onWriteError = (failed: AppFailure | undefined): void => {
    haptic("error");
    showError(failed === undefined ? MARK_FAILED : failureMessage(failed));
  };

  const markRead = useApiMutation<string, unknown>({
    invalidates: [inboxKeys.all],
    onError: onWriteError,
    program: (id) =>
      api === null || keys === null
        ? Effect.void
        : keys.run(`read-${id}`, (key) => markInboxItemRead(api, key, id)),
  });
  const markAll = useApiMutation<void, unknown>({
    invalidates: [inboxKeys.all],
    onError: onWriteError,
    onSettled: () => {
      markingAllRef.current = false;
    },
    // Runs after the refetch, so the buzz lands with the cleared unread marks.
    onSuccess: () => haptic("success"),
    program: () =>
      api === null || keys === null
        ? Effect.void
        : keys.run("read-all", (key) => markAllInboxRead(api, key)),
  });

  const markReadNow = markRead.mutate;
  const markAllNow = markAll.mutate;
  const ready = api !== null && keys !== null;
  const handlePress = useCallback(
    (id: string, taskId: string | null, unread: boolean): void => {
      if (ready && unread) markReadNow(id);
      if (taskId !== null) onOpenTask(taskId);
    },
    [markReadNow, onOpenTask, ready],
  );
  const renderItem = useCallback<ListRenderItem<InboxItem>>(
    ({ item }) => (
      <InboxRow
        id={item.id}
        onPress={handlePress}
        projectName={item.projectName}
        taskId={item.taskId}
        text={item.text}
        type={item.type}
        unread={item.readAt === null}
      />
    ),
    [handlePress],
  );
  const loadMore = useCallback(() => {
    if (hasNextPage && !isFetchingNextPage) onLoadMore?.();
  }, [hasNextPage, isFetchingNextPage, onLoadMore]);

  const pressMarkAll = (): void => {
    if (!ready || markingAllRef.current) return;
    markingAllRef.current = true;
    markAllNow();
  };

  const groups = splitInbox(items);
  const visible = tab === "all" ? groups.all : groups.unread;
  const showRows = failure === null && !isLoading;

  let empty: ReactNode;
  if (failure !== null) {
    empty = <WorkspaceErrorState failure={failure} onRetry={onRetry ?? noop} />;
  } else if (isLoading) {
    empty = (
      <WorkspaceLoadingRegion isLoading label="Loading inbox">
        <SkelterInboxRows hasSkeleton isLoading rows={SKELETON_ROWS} />
      </WorkspaceLoadingRegion>
    );
  } else if (tab === "unread" && hasNextPage) {
    // The loaded pages hold no unread items, but older pages may.
    empty = (
      <WorkspaceEmptyState
        action={{ label: isFetchingNextPage ? "Loading…" : "Load older", onPress: loadMore }}
        message="No unread items in the notifications loaded so far."
        title="Nothing unread yet"
      />
    );
  } else {
    empty = <WorkspaceEmptyState message="You are all caught up." title="Inbox zero" />;
  }

  const header = showRows ? (
    <View style={styles.tabs}>
      <WorkspaceChip
        accessibilityRole="tab"
        color="gray"
        label={`All ${groups.all.length}`}
        onPress={() => setTab("all")}
        selected={tab === "all"}
      />
      <WorkspaceChip
        accessibilityRole="tab"
        color="green"
        label={`Unread ${groups.unread.length}`}
        onPress={() => setTab("unread")}
        selected={tab === "unread"}
      />
      <View style={styles.spacer} />
      {groups.unread.length > 0 ? (
        <Pressable
          accessibilityRole="button"
          accessibilityState={{ disabled: markAll.isPending }}
          disabled={markAll.isPending}
          onPress={pressMarkAll}
          style={({ pressed }) => [styles.markAll, { opacity: pressed ? 0.7 : 1 }]}
        >
          <Text style={[typeStyle("sm", { weight: 500 }), { color: palette.accent }]}>Mark all read</Text>
        </Pressable>
      ) : null}
    </View>
  ) : undefined;

  return (
    <WorkspaceListScreen
      data={showRows ? visible : NO_ITEMS}
      empty={empty}
      footer={
        isFetchingNextPage ? (
          <ActivityIndicator accessibilityLabel="Loading more" style={styles.footer} />
        ) : undefined
      }
      header={header}
      keyExtractor={keyOfItem}
      onEndReached={loadMore}
      onEndReachedThreshold={0.5}
      renderItem={renderItem}
      title="Inbox"
    />
  );
};

const styles = StyleSheet.create({
  footer: {
    paddingVertical: spacing.s4,
  },
  item: {
    alignItems: "flex-start",
    borderRadius: radii.md,
    flexDirection: "row",
    gap: spacing.s3,
    minHeight: 44,
    paddingHorizontal: spacing.s3,
    paddingVertical: spacing.s3,
  },
  itemText: {
    flex: 1,
    gap: 2,
  },
  markAll: {
    alignItems: "center",
    justifyContent: "center",
    minHeight: 44,
    paddingHorizontal: spacing.s2,
  },
  spacer: {
    flex: 1,
  },
  tabs: {
    alignItems: "center",
    flexDirection: "row",
    gap: spacing.s2,
  },
  unreadDot: {
    borderRadius: radii.full,
    height: 8,
    marginTop: 7,
    width: 8,
  },
});

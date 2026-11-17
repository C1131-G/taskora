import { Effect, Exit } from "effect";
import { withSkeleton } from "react-zero-skeleton";
import { useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { useQueryClient } from "@tanstack/react-query";

import { WorkspaceChip } from "@/components/workspace/workspace-chip";
import { WorkspaceEmptyState } from "@/components/workspace/workspace-empty-state";
import { WorkspaceLoadingRegion } from "@/components/workspace/workspace-loading";
import { WorkspaceScreen } from "@/components/workspace/workspace-screen";
import { useErrorToast } from "@/components/workspace/error-toast-context";
import { failureMessage } from "@/components/workspace/workspace-error-state";
import type { AppFailure } from "@/errors";
import {
  markAllInboxRead,
  markInboxItemRead,
  splitInbox,
  type InboxItem,
} from "@/features/inbox/queries";
import { failureOf, type ApiContextValue, type KeysContextValue } from "@/runtime/api-hooks";
import { useHapticFeedback, type HapticEvent } from "@/runtime/haptics-hooks";
import { useTheme } from "@/theme/theme-provider";
import { typeStyle } from "@/theme/type-scale";
import { radii, shadows, spacing, theme } from "@/theme/tokens.generated";

export interface InboxScreenProps {
  /** Null while the session restores; the screen then only renders its skeleton. */
  readonly api: ApiContextValue | null;
  readonly items: readonly InboxItem[];
  readonly keys: KeysContextValue | null;
  readonly onOpenTask: (taskId: string) => void;
}

/** The inbox body: All/Unread tabs, per-item read marks and a mark-all action. */
const InboxContent = ({ api, items, keys, onOpenTask }: InboxScreenProps) => {
  const [tab, setTab] = useState<"all" | "unread">("all");
  const queryClient = useQueryClient();
  const { isDark } = useTheme();
  const palette = isDark ? theme.dark : theme.light;
  const groups = splitInbox(items);
  const visible = tab === "all" ? groups.all : groups.unread;
  const showError = useErrorToast();
  const haptic = useHapticFeedback();

  const updateReadState = async (
    operation: Effect.Effect<unknown, AppFailure>,
    successHaptic?: HapticEvent,
  ): Promise<void> => {
    const result = await Effect.runPromiseExit(operation);
    if (Exit.isSuccess(result)) {
      await queryClient.invalidateQueries({ queryKey: ["inbox"] });
      // After the refetch, so the buzz lands with the cleared unread marks.
      if (successHaptic !== undefined) {
        haptic(successHaptic);
      }
      return;
    }
    const failure = failureOf(result);
    haptic("warning");
    showError(failure === undefined ? "Could not update the inbox." : failureMessage(failure));
  };

  const markRead = (id: string): void => {
    if (api === null || keys === null) return;
    void updateReadState(keys.run(`read-${id}`, (key) => markInboxItemRead(api, key, id)));
  };

  const markAll = (): void => {
    if (api === null || keys === null) return;
    void updateReadState(
      keys.run("read-all", (key) => markAllInboxRead(api, key)),
      "success",
    );
  };

  return (
    <View style={styles.content}>
      <View style={styles.tabs}>
        <Pressable
          accessibilityRole="tab"
          accessibilityState={{ selected: tab === "all" }}
          onPress={() => setTab("all")}
        >
          <WorkspaceChip color="gray" label={`All ${groups.all.length}`} selected={tab === "all"} />
        </Pressable>
        <Pressable
          accessibilityRole="tab"
          accessibilityState={{ selected: tab === "unread" }}
          onPress={() => setTab("unread")}
        >
          <WorkspaceChip
            color="green"
            label={`Unread ${groups.unread.length}`}
            selected={tab === "unread"}
          />
        </Pressable>
        <View style={styles.spacer} />
        {groups.unread.length > 0 ? (
          <Pressable
            accessibilityRole="button"
            onPress={markAll}
            style={({ pressed }) => [styles.markAll, { opacity: pressed ? 0.7 : 1 }]}
          >
            <Text style={[typeStyle("sm", { weight: 500 }), { color: palette.accent }]}>
              Mark all read
            </Text>
          </Pressable>
        ) : null}
      </View>
      {visible.length === 0 ? (
        <WorkspaceEmptyState message="You are all caught up." title="Inbox zero" />
      ) : (
        <View
          style={[
            styles.list,
            {
              backgroundColor: palette.surface,
              boxShadow: (isDark ? shadows.dark : shadows.light).card,
            },
          ]}
        >
          {visible.map((item) => (
            <Pressable
              accessibilityLabel={`${item.readAt === null ? "Unread" : "Read"}: ${item.text}`}
              accessibilityRole="button"
              key={item.id}
              onPress={() => {
                if (item.readAt === null) {
                  markRead(item.id);
                }
                if (item.taskId !== null) {
                  onOpenTask(item.taskId);
                }
              }}
              style={({ pressed }) => [
                styles.item,
                { backgroundColor: pressed ? palette.surface2 : "transparent" },
              ]}
            >
              <View
                style={[
                  styles.unreadDot,
                  { backgroundColor: item.readAt === null ? palette.accent : "transparent" },
                ]}
              />
              <View style={styles.itemText}>
                <Text
                  style={[
                    typeStyle("md", { weight: item.readAt === null ? 600 : 400 }),
                    { color: palette.text },
                  ]}
                >
                  {item.text}
                </Text>
                <Text style={[typeStyle("xs"), { color: palette.text3 }]}>
                  {item.type}
                  {item.projectName === null ? "" : ` · ${item.projectName}`}
                </Text>
              </View>
            </Pressable>
          ))}
        </View>
      )}
    </View>
  );
};

const SkelterInboxContent = withSkeleton(InboxContent);

/** The inbox screen; the frame and title stay real while the body loads. */
export const InboxScreen = ({ isLoading, ...props }: InboxScreenProps & { readonly isLoading: boolean }) => (
  <WorkspaceScreen title="Inbox">
    <WorkspaceLoadingRegion isLoading={isLoading} label="Loading inbox">
      <SkelterInboxContent hasSkeleton={isLoading} isLoading={isLoading} {...props} />
    </WorkspaceLoadingRegion>
  </WorkspaceScreen>
);

const styles = StyleSheet.create({
  content: {
    // Matches WorkspaceScreen's content gap, which no longer reaches these children.
    gap: spacing.s4,
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
  list: {
    // Concentric with the rows: row radius md plus the s1 inset.
    borderRadius: radii.md + spacing.s1,
    padding: spacing.s1,
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

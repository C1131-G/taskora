import { Effect } from "effect";
import { StyleSheet, Text, View } from "react-native";

import { WorkspaceEmptyState } from "@/components/workspace/workspace-empty-state";
import { WorkspaceErrorState } from "@/components/workspace/workspace-error-state";
import { WorkspaceAvatar } from "@/components/workspace/workspace-avatar";
import { WorkspaceButton } from "@/components/workspace/workspace-button";
import { WorkspaceListGroup, WorkspaceListRow } from "@/components/workspace/workspace-list-row";
import { WorkspaceLoadingRegion } from "@/components/workspace/workspace-loading";
import { SkelterListRows, type ListRow } from "@/features/workspace/domain-list-screen";
import { useApi, useApiQuery } from "@/runtime/api-hooks";
import type { AppFailure } from "@/errors";
import { useTheme } from "@/theme/theme-provider";
import { typeStyle } from "@/theme/type-scale";
import { radii, shadows, spacing, theme } from "@/theme/tokens.generated";

/** A query-backed list body for the portal screens. */
export const PortalListBody = ({
  emptyTitle,
  program,
  queryKey,
}: {
  readonly emptyTitle: string;
  readonly program: (api: NonNullable<ReturnType<typeof useApi>>) => Effect.Effect<{ rows: readonly ListRow[] }, AppFailure>;
  readonly queryKey: readonly unknown[];
}) => {
  const api = useApi();
  const list = useApiQuery({
    enabled: api !== null,
    program: api === null ? Effect.succeed({ rows: [] }) : program(api),
    queryKey,
  });
  const rows = list.data?.rows ?? [];

  if (list.error !== null && list.error !== undefined) {
    return <WorkspaceErrorState failure={list.error} onRetry={() => void list.refetch()} />;
  }
  const displayRows = list.isPending ? SKELETON_ROWS : rows;
  if (!list.isPending && displayRows.length === 0) {
    return <WorkspaceEmptyState message="Nothing here yet." title={emptyTitle} />;
  }
  return (
    <WorkspaceLoadingRegion isLoading={list.isPending} label={`Loading ${emptyTitle}`}>
      <SkelterListRows hasSkeleton={list.isPending} isLoading={list.isPending} rows={displayRows} />
    </WorkspaceLoadingRegion>
  );
};

/** Typical-length rows so Skelter sizes its bones like real portal rows. */
const SKELETON_ROWS: readonly ListRow[] = [
  { id: "skeleton-portal-1", subtitle: "Website relaunch · Awaiting review", title: "Checkout button overlaps footer" },
  { id: "skeleton-portal-2", subtitle: "Website relaunch · In progress", title: "Pricing table misaligned on iPad" },
  { id: "skeleton-portal-3", subtitle: "Customer portal · Open", title: "Invoice PDF shows wrong due date" },
];

/** The portal account screen: identity card and sign-out. */
export const PortalAccountBody = ({
  email,
  name,
  onOpenNotifications,
  onSignOut,
}: {
  readonly email: string;
  readonly name: string;
  readonly onOpenNotifications?: () => void;
  readonly onSignOut: () => void;
}) => {
  const { isDark } = useTheme();
  const palette = isDark ? theme.dark : theme.light;

  return (
    <View style={styles.stack}>
      <View
        style={[
          styles.card,
          { backgroundColor: palette.surface, boxShadow: (isDark ? shadows.dark : shadows.light).card },
        ]}
      >
        <WorkspaceAvatar name={name} size={48} />
        <View style={styles.identity}>
          <Text style={[typeStyle("lg", { weight: 600 }), { color: palette.text }]}>{name}</Text>
          <Text style={[typeStyle("sm"), { color: palette.text3 }]}>{email}</Text>
        </View>
      </View>
      {onOpenNotifications === undefined ? null : (
        <WorkspaceListGroup>
          <WorkspaceListRow onPress={onOpenNotifications} title="Notifications" />
        </WorkspaceListGroup>
      )}
      <WorkspaceButton onPress={onSignOut} variant="secondary">
        Sign out
      </WorkspaceButton>
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    alignItems: "center",
    borderRadius: radii.xl,
    flexDirection: "row",
    gap: spacing.s3,
    padding: spacing.s4,
  },
  identity: {
    flex: 1,
    gap: 2,
  },
  stack: {
    gap: spacing.s4,
  },
});

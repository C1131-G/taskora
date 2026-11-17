import { Effect, Exit } from "effect";
import type { AppFailure } from "@/errors";
import { useState } from "react";
import { withSkeleton } from "react-zero-skeleton";
import { Pressable, StyleSheet, Text, TextInput, View } from "react-native";
import { MagnifyingGlass } from "phosphor-react-native";

import { WorkspaceEmptyState } from "@/components/workspace/workspace-empty-state";
import { useErrorToast } from "@/components/workspace/error-toast-provider";
import { failureMessage, WorkspaceErrorState } from "@/components/workspace/workspace-error-state";
import { WorkspaceListGroup, WorkspaceListRow } from "@/components/workspace/workspace-list-row";
import { WorkspaceLoadingRegion } from "@/components/workspace/workspace-loading";
import { WorkspaceScreen } from "@/components/workspace/workspace-screen";
import { WorkspaceTabShell } from "@/features/navigation/workspace-tabs";
import { failureOf, useApi, useApiQuery } from "@/runtime/api-hooks";
import { useTheme } from "@/theme/theme-provider";
import { typeStyle } from "@/theme/type-scale";
import { radii, spacing, theme } from "@/theme/tokens.generated";

export interface ListRow {
  readonly id: string;
  readonly kind?: string;
  readonly subtitle: string | null;
  readonly title: string;
}

/** Typical-length rows so Skelter sizes its bones like real list rows. */
const SKELETON_ROWS: readonly ListRow[] = [
  { id: "skeleton-row-1", subtitle: "Northwind Traders · 12 open", title: "Website relaunch" },
  { id: "skeleton-row-2", subtitle: "Contoso Health · 8 open", title: "Mobile onboarding flow" },
  { id: "skeleton-row-3", subtitle: "Fabrikam Studio · 5 open", title: "Customer portal refresh" },
];

/** One generic, query-backed list screen; domains pass their fetch program. */
export const DomainListScreen = ({
  emptyMessage,
  emptyTitle,
  program,
  queryKey,
  screenTitle,
  trailing,
}: {
  readonly emptyMessage: string;
  readonly emptyTitle: string;
  readonly program: (rows: readonly ListRow[]) => Effect.Effect<{ rows: readonly ListRow[] }, AppFailure>;
  readonly queryKey: readonly unknown[];
  readonly screenTitle: string;
  readonly trailing?: (row: ListRow) => string | null;
}) => {
  const api = useApi();
  const list = useApiQuery({
    enabled: api !== null,
    program: api === null ? Effect.succeed({ rows: [] }) : program([]),
    queryKey,
  });
  const rows = list.data?.rows ?? [];
  const displayRows = list.isPending ? SKELETON_ROWS : rows;

  return (
    <WorkspaceTabShell>
      <WorkspaceScreen title={screenTitle}>
        {list.error !== null && list.error !== undefined ? (
          <WorkspaceErrorState failure={list.error} onRetry={() => void list.refetch()} />
        ) : displayRows.length === 0 ? (
          <WorkspaceEmptyState message={emptyMessage} title={emptyTitle} />
        ) : (
          <WorkspaceLoadingRegion isLoading={list.isPending} label={`Loading ${screenTitle}`}>
            <SkelterListRows
              hasSkeleton={list.isPending}
              isLoading={list.isPending}
              rows={displayRows}
              {...(trailing === undefined ? {} : { trailing })}
            />
          </WorkspaceLoadingRegion>
        )}
      </WorkspaceScreen>
    </WorkspaceTabShell>
  );
};

/** Plain list rows with an optional trailing note; shared by workspace and portal lists. */
const ListRows = ({
  rows,
  trailing,
}: {
  readonly rows: readonly ListRow[];
  readonly trailing?: (row: ListRow) => string | null;
}) => {
  const { isDark } = useTheme();
  const palette = isDark ? theme.dark : theme.light;

  return (
    <WorkspaceListGroup>
      {rows.map((row) => {
        const note = trailing?.(row) ?? null;
        return (
          <WorkspaceListRow
            key={row.id}
            {...(row.subtitle === null ? {} : { subtitle: row.subtitle })}
            title={row.title}
            {...(note === null
              ? {}
              : { trailing: <Text style={[typeStyle("sm"), { color: palette.text3 }]}>{note}</Text> })}
          />
        );
      })}
    </WorkspaceListGroup>
  );
};

export const SkelterListRows = withSkeleton(ListRows);

/** The search screen: text in, workspace hits out. */
export const SearchScreen = ({
  onHit,
  search,
}: {
  readonly onHit: (hit: ListRow) => void;
  readonly search: (
    query: string,
  ) => Effect.Effect<{ rows: readonly ListRow[] }, AppFailure>;
}) => {
  const [query, setQuery] = useState("");
  const [hits, setHits] = useState<readonly ListRow[]>([]);
  const showError = useErrorToast();

  const submit = (): void => {
    const trimmed = query.trim();
    if (trimmed.length === 0) {
      setHits([]);
      return;
    }
    void (async () => {
      const result = await Effect.runPromiseExit(search(trimmed));
      if (Exit.isSuccess(result)) {
        setHits(result.value.rows);
        return;
      }
      const failure = failureOf(result);
      showError(failure === undefined ? "Could not search. Please try again." : failureMessage(failure));
    })();
  };

  return (
    <WorkspaceTabShell>
      <WorkspaceScreen title="Search">
        <SearchBox onChange={setQuery} onSubmit={submit} value={query} />
        {hits.length === 0 ? (
          <WorkspaceEmptyState message="Search projects and tasks by name." title="Find work" />
        ) : (
          <WorkspaceListGroup label={`${hits.length} ${hits.length === 1 ? "result" : "results"}`}>
            {hits.map((hit) => (
              <WorkspaceListRow
                accessibilityLabel={`Open ${hit.title}`}
                key={hit.id}
                onPress={() => onHit(hit)}
                {...(hit.subtitle === null ? {} : { subtitle: hit.subtitle })}
                title={hit.title}
              />
            ))}
          </WorkspaceListGroup>
        )}
      </WorkspaceScreen>
    </WorkspaceTabShell>
  );
};

const SearchBox = (props: {
  readonly onChange: (value: string) => void;
  readonly onSubmit: () => void;
  readonly value: string;
}) => {
  const { isDark } = useTheme();
  const palette = isDark ? theme.dark : theme.light;

  return (
    <View style={styles.searchRow}>
      <View style={[styles.inputFrame, { backgroundColor: palette.sunken, borderColor: palette.border }]}>
        <MagnifyingGlass color={palette.text3} size={18} />
        <TextInput
          accessibilityLabel="Search query"
          maxFontSizeMultiplier={2}
          onChangeText={props.onChange}
          onSubmitEditing={props.onSubmit}
          placeholder="Search projects and tasks"
          placeholderTextColor={palette.text3}
          returnKeyType="search"
          style={[typeStyle("md"), styles.input, { color: palette.text }]}
          value={props.value}
        />
      </View>
      <Pressable
        accessibilityRole="button"
        onPress={props.onSubmit}
        style={({ pressed }) => [styles.searchButton, { opacity: pressed ? 0.7 : 1 }]}
      >
        <Text style={[typeStyle("md", { weight: 500 }), { color: palette.accent }]}>Search</Text>
      </Pressable>
    </View>
  );
};

const styles = StyleSheet.create({
  input: {
    flex: 1,
    minHeight: 44,
  },
  inputFrame: {
    alignItems: "center",
    borderRadius: radii.md,
    borderWidth: 1,
    flex: 1,
    flexDirection: "row",
    gap: spacing.s2,
    paddingHorizontal: spacing.s3,
  },
  searchButton: {
    alignItems: "center",
    justifyContent: "center",
    minHeight: 44,
    paddingHorizontal: spacing.s3,
  },
  searchRow: {
    alignItems: "center",
    flexDirection: "row",
    gap: spacing.s1,
  },
});

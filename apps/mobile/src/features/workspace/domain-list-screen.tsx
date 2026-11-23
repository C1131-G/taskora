import { Effect, Exit } from "effect";
import type { AppFailure } from "@/errors";
import { memo, useCallback, useState, type ReactNode } from "react";
import { withSkeleton } from "react-zero-skeleton";
import { Pressable, StyleSheet, Text, TextInput, View, type ListRenderItem } from "react-native";
import { MagnifyingGlass } from "phosphor-react-native";

import { WorkspaceEmptyState } from "@/components/workspace/workspace-empty-state";
import { useErrorToast } from "@/components/workspace/error-toast-provider";
import { failureMessage, WorkspaceErrorState } from "@/components/workspace/workspace-error-state";
import { WorkspaceListGroup, WorkspaceListRow } from "@/components/workspace/workspace-list-row";
import { WorkspaceLoadingRegion } from "@/components/workspace/workspace-loading";
import { WorkspaceListScreen } from "@/components/workspace/workspace-screen";
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

  return (
    <DomainListView
      emptyMessage={emptyMessage}
      emptyTitle={emptyTitle}
      // Cached rows stay on screen when a background refresh fails.
      failure={list.data === undefined ? list.error : null}
      isLoading={list.isPending}
      label={`Loading ${screenTitle}`}
      onRetry={() => void list.refetch()}
      rows={list.data?.rows ?? []}
      title={screenTitle}
      {...(trailing === undefined ? {} : { trailing })}
    />
  );
};

const keyOfRow = (row: ListRow): string => row.id;

/** One virtualized row: its own card, with the optional trailing note built from a primitive. */
const DomainRow = memo(function DomainRow({ note, row }: { readonly note: string | null; readonly row: ListRow }) {
  const { isDark } = useTheme();
  const palette = isDark ? theme.dark : theme.light;

  return (
    <WorkspaceListGroup>
      <WorkspaceListRow
        {...(row.subtitle === null ? {} : { subtitle: row.subtitle })}
        title={row.title}
        {...(note === null
          ? {}
          : { trailing: <Text style={[typeStyle("sm"), { color: palette.text3 }]}>{note}</Text> })}
      />
    </WorkspaceListGroup>
  );
});

/** The four list states in one virtualized screen: error with retry, loading bones, empty, rows. */
export const DomainListView = ({
  emptyMessage,
  emptyTitle,
  failure,
  isLoading,
  label,
  onRetry,
  rows,
  title,
  trailing,
}: {
  readonly emptyMessage: string;
  readonly emptyTitle: string;
  /** Set only when there is nothing cached to show. */
  readonly failure: AppFailure | null;
  readonly isLoading: boolean;
  readonly label: string;
  readonly onRetry: () => void;
  readonly rows: readonly ListRow[];
  readonly title: string;
  readonly trailing?: (row: ListRow) => string | null;
}) => {
  const renderItem = useCallback<ListRenderItem<ListRow>>(
    ({ item }) => <DomainRow note={trailing?.(item) ?? null} row={item} />,
    [trailing],
  );

  const showRows = failure === null && !isLoading;
  let empty: ReactNode;
  if (failure !== null) {
    empty = <WorkspaceErrorState failure={failure} onRetry={onRetry} />;
  } else if (isLoading) {
    empty = (
      <WorkspaceLoadingRegion isLoading label={label}>
        <SkelterListRows hasSkeleton isLoading rows={SKELETON_ROWS} />
      </WorkspaceLoadingRegion>
    );
  } else {
    empty = <WorkspaceEmptyState message={emptyMessage} title={emptyTitle} />;
  }

  return (
    <WorkspaceTabShell>
      <WorkspaceListScreen
        data={showRows ? rows : EMPTY_ROWS}
        empty={empty}
        keyExtractor={keyOfRow}
        renderItem={renderItem}
        title={title}
      />
    </WorkspaceTabShell>
  );
};

const EMPTY_ROWS: readonly ListRow[] = [];

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

  const renderHit = useCallback<ListRenderItem<ListRow>>(
    ({ item }) => <SearchHit hit={item} onHit={onHit} />,
    [onHit],
  );

  return (
    <WorkspaceTabShell>
      <WorkspaceListScreen
        data={hits}
        empty={<WorkspaceEmptyState message="Search projects and tasks by name." title="Find work" />}
        header={
          <View style={styles.searchHeader}>
            <SearchBox onChange={setQuery} onSubmit={submit} value={query} />
            {hits.length === 0 ? null : (
              <ResultCount count={hits.length} />
            )}
          </View>
        }
        keyExtractor={keyOfRow}
        renderItem={renderHit}
        title="Search"
      />
    </WorkspaceTabShell>
  );
};

const ResultCount = ({ count }: { readonly count: number }) => {
  const { isDark } = useTheme();
  const palette = isDark ? theme.dark : theme.light;

  return (
    <Text accessibilityRole="header" style={[typeStyle("sm", { weight: 500 }), styles.resultCount, { color: palette.text2 }]}>
      {`${count} ${count === 1 ? "result" : "results"}`}
    </Text>
  );
};

/** One search hit; the open handler gets the row, so the callback identity stays stable. */
const SearchHit = memo(function SearchHit({
  hit,
  onHit,
}: {
  readonly hit: ListRow;
  readonly onHit: (hit: ListRow) => void;
}) {
  const open = useCallback(() => onHit(hit), [hit, onHit]);

  return (
    <WorkspaceListGroup>
      <WorkspaceListRow
        accessibilityLabel={`Open ${hit.title}`}
        onPress={open}
        {...(hit.subtitle === null ? {} : { subtitle: hit.subtitle })}
        title={hit.title}
      />
    </WorkspaceListGroup>
  );
});

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
  resultCount: {
    paddingHorizontal: spacing.s1,
  },
  searchButton: {
    alignItems: "center",
    justifyContent: "center",
    minHeight: 44,
    paddingHorizontal: spacing.s3,
  },
  searchHeader: {
    gap: spacing.s4,
  },
  searchRow: {
    alignItems: "center",
    flexDirection: "row",
    gap: spacing.s1,
  },
});

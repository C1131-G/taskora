import { type ReactNode } from "react";
import { FlatList, type ListRenderItem, ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { useTheme } from "@/theme/theme-provider";
import { typeStyle } from "@/theme/type-scale";
import { spacing, theme } from "@/theme/tokens.generated";

export interface WorkspaceScreenProps {
  readonly children: ReactNode;
  readonly title?: string;
  readonly toolbar?: ReactNode;
}

const ScreenTitle = ({ color, title }: { readonly color: string; readonly title: string }) => (
  <Text
    accessibilityRole="header"
    numberOfLines={2}
    style={[typeStyle("2xl", { leading: "tight", weight: 600 }), styles.title, { color }]}
  >
    {title}
  </Text>
);

/** The page frame: safe area, title header and a scrolling, padded content column. */
export const WorkspaceScreen = ({ children, title, toolbar }: WorkspaceScreenProps) => {
  const { isDark } = useTheme();
  const palette = isDark ? theme.dark : theme.light;

  return (
    <SafeAreaView style={[styles.host, { backgroundColor: palette.bg }]} edges={["top"]}>
      {title === undefined ? null : <ScreenTitle color={palette.text} title={title} />}
      {toolbar === undefined ? null : <View style={styles.toolbar}>{toolbar}</View>}
      <ScrollView
        automaticallyAdjustKeyboardInsets
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
        style={styles.scroll}
      >
        {children}
      </ScrollView>
    </SafeAreaView>
  );
};

export interface WorkspaceListScreenProps<T> {
  readonly data: readonly T[];
  /** Shown instead of rows when `data` is empty: loading bones, an error or an empty state. */
  readonly empty?: ReactNode;
  /** Re-renders rows whose inputs live outside `data` and `renderItem`. */
  readonly extraData?: unknown;
  /** Rendered after the last row (a load-more spinner, a count). */
  readonly footer?: ReactNode;
  /** Extras under the title and toolbar that scroll with the list (filters, a search box). */
  readonly header?: ReactNode;
  readonly keyExtractor: (item: T) => string;
  readonly onEndReached?: () => void;
  readonly onEndReachedThreshold?: number;
  readonly onRefresh?: () => void;
  readonly refreshing?: boolean;
  readonly renderItem: ListRenderItem<T>;
  readonly title?: string;
  readonly toolbar?: ReactNode;
}

/**
 * The virtualized page frame: the same safe area, title and toolbar as
 * WorkspaceScreen, but the title, toolbar and header scroll as the list's
 * header and rows are windowed by a FlatList. Pass a memoized row component
 * and stable callbacks from `renderItem`.
 */
export const WorkspaceListScreen = <T,>({
  data,
  empty,
  extraData,
  footer,
  header,
  keyExtractor,
  onEndReached,
  onEndReachedThreshold,
  onRefresh,
  refreshing,
  renderItem,
  title,
  toolbar,
}: WorkspaceListScreenProps<T>) => {
  const { isDark } = useTheme();
  const palette = isDark ? theme.dark : theme.light;

  const listHeader = (
    <View style={styles.listHeader}>
      {title === undefined ? null : <ScreenTitle color={palette.text} title={title} />}
      {toolbar === undefined ? null : <View style={styles.toolbar}>{toolbar}</View>}
      {header === undefined ? null : <View style={styles.headerExtras}>{header}</View>}
    </View>
  );

  return (
    <SafeAreaView style={[styles.host, { backgroundColor: palette.bg }]} edges={["top"]}>
      <FlatList
        automaticallyAdjustKeyboardInsets
        contentContainerStyle={styles.listContent}
        data={data}
        extraData={extraData}
        keyboardShouldPersistTaps="handled"
        keyExtractor={keyExtractor}
        ListEmptyComponent={empty === undefined ? undefined : <>{empty}</>}
        ListFooterComponent={footer === undefined ? undefined : <>{footer}</>}
        ListHeaderComponent={listHeader}
        onEndReached={onEndReached}
        onEndReachedThreshold={onEndReachedThreshold}
        onRefresh={onRefresh}
        refreshing={refreshing}
        renderItem={renderItem}
        style={styles.scroll}
      />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  content: {
    gap: spacing.s4,
    paddingBottom: spacing.s8,
    paddingHorizontal: spacing.s4,
    paddingTop: spacing.s3,
  },
  host: {
    flex: 1,
  },
  headerExtras: {
    paddingHorizontal: spacing.s4,
    paddingTop: spacing.s3,
  },
  listContent: {
    gap: spacing.s2,
    paddingBottom: spacing.s8,
    paddingHorizontal: spacing.s4,
  },
  listHeader: {
    // Title and toolbar bring their own gutter; bleed past the list's padding.
    marginHorizontal: -spacing.s4,
    paddingBottom: spacing.s1,
  },
  scroll: {
    flex: 1,
  },
  title: {
    paddingHorizontal: spacing.s4,
    paddingTop: spacing.s4,
  },
  toolbar: {
    paddingHorizontal: spacing.s4,
    paddingTop: spacing.s3,
  },
});

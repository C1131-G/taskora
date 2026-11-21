import { Effect } from "effect";
import { StyleSheet, Text } from "react-native";

import { WorkspaceEmptyState } from "@/components/workspace/workspace-empty-state";
import { WorkspaceErrorState } from "@/components/workspace/workspace-error-state";
import { WorkspaceLoadingRegion } from "@/components/workspace/workspace-loading";
import { WorkspaceScreen } from "@/components/workspace/workspace-screen";
import { PLACEHOLDER_PORTAL_PROJECTS } from "@/features/portal/portal-placeholders";
import { listPortalBugs, listPortalProjects } from "@/features/portal/queries";
import { SkelterListRows, type ListRow } from "@/features/workspace/domain-list-screen";
import { useApi, useApiQuery } from "@/runtime/api-hooks";
import { portalKeys } from "@/runtime/query-keys";
import { useTheme } from "@/theme/theme-provider";
import { typeStyle } from "@/theme/type-scale";
import { spacing, theme } from "@/theme/tokens.generated";

/** Typical-length reports so Skelter sizes the bug bones like real ones. */
const PLACEHOLDER_BUG_ROWS: readonly ListRow[] = [
  { id: "placeholder-bug-1", subtitle: "acknowledged", title: "Checkout button overlaps footer" },
  { id: "placeholder-bug-2", subtitle: "in_progress", title: "Pricing table misaligned on iPad" },
  { id: "placeholder-bug-3", subtitle: "submitted", title: "Invoice PDF shows wrong due date" },
];

const toProjectRows = (projects: readonly { readonly id: string; readonly key: string; readonly name: string }[]): readonly ListRow[] =>
  projects.map((project) => ({ id: project.id, subtitle: project.key, title: `${project.key} ${project.name}` }));

/** A real section header that lines up like a WorkspaceListGroup label, so only rows are boned. */
const SectionLabel = ({ children }: { readonly children: string }) => {
  const { isDark } = useTheme();
  const palette = isDark ? theme.dark : theme.light;

  return (
    <Text
      accessibilityRole="header"
      style={[typeStyle("sm", { weight: 500 }), styles.sectionLabel, { color: palette.text2 }]}
    >
      {children}
    </Text>
  );
};

/** The client portal home: their projects and reported bugs. */
export const PortalHomeScreen = () => {
  const api = useApi();
  const projects = useApiQuery({
    enabled: api !== null,
    program: api === null ? Effect.succeed({ projects: [] }) : listPortalProjects(api),
    queryKey: portalKeys.projects(),
  });
  const bugs = useApiQuery({
    enabled: api !== null,
    program: api === null ? Effect.succeed([]) : listPortalBugs(api),
    queryKey: portalKeys.bugList(),
  });
  const projectsLoading = api === null || projects.isPending;
  const bugsLoading = api === null || bugs.isPending;
  // Cached sections stay on screen when a background refresh fails.
  const failure = (projects.data === undefined ? projects.error : null) ?? (bugs.data === undefined ? bugs.error : null);
  const bugRows = (bugs.data ?? []).map((bug) => ({ id: bug.id, subtitle: bug.status, title: bug.title }));

  if (failure !== null) {
    return (
      <WorkspaceScreen title="Portal">
        <WorkspaceErrorState
          failure={failure}
          onRetry={() => {
            void projects.refetch();
            void bugs.refetch();
          }}
        />
      </WorkspaceScreen>
    );
  }

  return (
    <WorkspaceScreen title="Portal">
      <SectionLabel>Projects</SectionLabel>
      <WorkspaceLoadingRegion isLoading={projectsLoading} label="Loading projects">
        <SkelterListRows
          hasSkeleton={projectsLoading}
          isLoading={projectsLoading}
          rows={toProjectRows(projectsLoading ? PLACEHOLDER_PORTAL_PROJECTS : (projects.data?.projects ?? []))}
        />
      </WorkspaceLoadingRegion>
      <SectionLabel>Your bugs</SectionLabel>
      {!bugsLoading && bugRows.length === 0 ? (
        <WorkspaceEmptyState message="Report a problem and it lands here." title="No reports" />
      ) : (
        <WorkspaceLoadingRegion isLoading={bugsLoading} label="Loading your bugs">
          <SkelterListRows
            hasSkeleton={bugsLoading}
            isLoading={bugsLoading}
            rows={bugsLoading ? PLACEHOLDER_BUG_ROWS : bugRows}
          />
        </WorkspaceLoadingRegion>
      )}
    </WorkspaceScreen>
  );
};

const styles = StyleSheet.create({
  sectionLabel: {
    // WorkspaceListGroup puts s2 between label and card; the screen column gap is s4.
    marginBottom: -spacing.s2,
    paddingHorizontal: spacing.s1,
  },
});

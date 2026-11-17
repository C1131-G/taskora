import { useEffect, useState } from "react";
import { withSkeleton } from "react-zero-skeleton";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { Check, SignOut } from "phosphor-react-native";

import { WorkspaceListGroup, WorkspaceListRow } from "@/components/workspace/workspace-list-row";
import { WorkspaceLoadingRegion } from "@/components/workspace/workspace-loading";
import { WorkspaceScreen } from "@/components/workspace/workspace-screen";
import { WorkspaceTabShell } from "@/features/navigation/workspace-tabs";
import { listBugs, listProjects, type BugSummary, type ProjectSummary } from "@/features/workspace/queries";
import { useApi, useApiQuery, type ApiContextValue } from "@/runtime/api-hooks";
import { useTheme } from "@/theme/theme-provider";
import { typeStyle } from "@/theme/type-scale";
import { radii, spacing, theme } from "@/theme/tokens.generated";
import { Effect } from "effect";

/** Typical-length rows so Skelter sizes its bones like a real home screen. */
const PLACEHOLDER_PROJECTS: readonly ProjectSummary[] = [
  { id: "placeholder-project-1", key: "WEB", name: "Website relaunch", openTasks: 12, progress: 64 },
  { id: "placeholder-project-2", key: "MOB", name: "Mobile onboarding flow", openTasks: 8, progress: 41 },
  { id: "placeholder-project-3", key: "POR", name: "Customer portal refresh", openTasks: 5, progress: 87 },
];

const PLACEHOLDER_BUGS: readonly BugSummary[] = [
  { clientCompanyName: null, id: "placeholder-bug-1", priority: "high", reference: "BUG-142", status: "open", title: "Checkout button overlaps footer" },
  { clientCompanyName: null, id: "placeholder-bug-2", priority: "medium", reference: "BUG-139", status: "in_progress", title: "Pricing table misaligned on iPad" },
  { clientCompanyName: null, id: "placeholder-bug-3", priority: "low", reference: "BUG-131", status: "open", title: "Invoice PDF shows wrong due date" },
];

const HomeContent = ({
  bugs,
  projects,
}: {
  readonly bugs: readonly BugSummary[];
  readonly projects: readonly ProjectSummary[];
}) => (
  <View style={styles.content}>
    {projects.length === 0 ? null : (
      <WorkspaceListGroup label="Projects">
        {projects.map((project) => (
          <WorkspaceListRow
            key={project.id}
            subtitle={`${project.openTasks} open · ${project.progress}%`}
            title={`${project.key} ${project.name}`}
          />
        ))}
      </WorkspaceListGroup>
    )}
    {bugs.length === 0 ? null : (
      <WorkspaceListGroup label="Open bugs">
        {bugs.map((bug) => (
          <WorkspaceListRow key={bug.id} subtitle={bug.status} title={bug.title} />
        ))}
      </WorkspaceListGroup>
    )}
  </View>
);

const SkelterHomeContent = withSkeleton(HomeContent);

/**
 * The workspace home: greeting, project progress and open bugs. A null api
 * (session still restoring) renders the same screen in its loading state;
 * without a name the greeting stays a plain "Hello" rather than a fake name.
 */
export const HomeScreen = ({
  api,
  name,
}: {
  readonly api: ApiContextValue | null;
  readonly name: string | undefined;
}) => {
  const projects = useApiQuery({
    enabled: api !== null,
    program: api === null ? Effect.succeed({ projects: [] }) : listProjects(api),
    queryKey: ["projects"],
  });
  const bugs = useApiQuery({
    enabled: api !== null,
    program: api === null ? Effect.succeed({ bugs: [] }) : listBugs(api),
    queryKey: ["bugs"],
  });
  const isLoading = api === null || projects.isPending || bugs.isPending;

  return (
    <WorkspaceTabShell>
      <WorkspaceScreen title={name === undefined ? "Hello" : `Hello, ${name.split(" ")[0] ?? name}`}>
        <WorkspaceLoadingRegion isLoading={isLoading} label="Loading home">
          <SkelterHomeContent
            bugs={isLoading ? PLACEHOLDER_BUGS : (bugs.data?.bugs ?? []).slice(0, 3)}
            hasSkeleton={isLoading}
            isLoading={isLoading}
            projects={isLoading ? PLACEHOLDER_PROJECTS : (projects.data?.projects ?? [])}
          />
        </WorkspaceLoadingRegion>
      </WorkspaceScreen>
    </WorkspaceTabShell>
  );
};

/** The bugs list. */
export const BugsScreen = () => {
  const api = useApi();
  const bugs = useApiQuery({
    enabled: api !== null,
    program:
      api === null
        ? Effect.succeed({ bugs: [] })
        : Effect.map(listBugs(api), (page) => ({ bugs: [...page.bugs] })),
    queryKey: ["bugs"],
  });
  const rows = bugs.data?.bugs ?? [];

  return (
    <WorkspaceTabShell>
      <WorkspaceScreen title="Bugs">
        {rows.length === 0 ? null : (
          <WorkspaceListGroup>
            {rows.map((bug) => (
              <WorkspaceListRow
                key={bug.id}
                subtitle={`${bug.reference} · ${bug.priority}`}
                title={bug.title}
              />
            ))}
          </WorkspaceListGroup>
        )}
      </WorkspaceScreen>
    </WorkspaceTabShell>
  );
};

/** The projects list. */
export const ProjectsScreen = () => {
  const api = useApi();
  const projects = useApiQuery({
    enabled: api !== null,
    program:
      api === null
        ? Effect.succeed({ projects: [] })
        : Effect.map(listProjects(api), (page) => ({ projects: [...page.projects] })),
    queryKey: ["projects"],
  });
  const rows = projects.data?.projects ?? [];

  return (
    <WorkspaceTabShell>
      <WorkspaceScreen title="Projects">
        {rows.length === 0 ? null : (
          <WorkspaceListGroup>
            {rows.map((project) => (
              <WorkspaceListRow
                key={project.id}
                subtitle={`${project.openTasks} open tasks · ${project.progress}%`}
                title={`${project.key} ${project.name}`}
              />
            ))}
          </WorkspaceListGroup>
        )}
      </WorkspaceScreen>
    </WorkspaceTabShell>
  );
};

const THEME_MODES = ["system", "light", "dark"] as const;
const THEME_LABELS: Record<(typeof THEME_MODES)[number], string> = {
  dark: "Dark",
  light: "Light",
  system: "Match system",
};

/** The settings screen: live theme controls through ThemePreferences. */
export const SettingsScreen = ({
  onOpenNotifications,
  onSignOut,
}: {
  readonly onOpenNotifications?: () => void;
  readonly onSignOut: () => void;
}) => {
  const { isDark, mode, setMode } = useTheme();
  const palette = isDark ? theme.dark : theme.light;
  const [picked, setPicked] = useState(mode);

  useEffect(() => {
    setPicked(mode);
  }, [mode]);

  return (
    <WorkspaceTabShell>
      <WorkspaceScreen title="Settings">
        <WorkspaceListGroup label="Appearance">
          {THEME_MODES.map((candidate) => (
            <Pressable
              accessibilityLabel={`Theme ${candidate}`}
              accessibilityRole="radio"
              accessibilityState={{ selected: picked === candidate }}
              key={candidate}
              onPress={() => setMode(candidate)}
              style={({ pressed }) => [
                styles.row,
                { backgroundColor: pressed ? palette.surface2 : "transparent" },
              ]}
            >
              <Text style={[typeStyle("md"), { color: palette.text, flex: 1 }]}>
                {THEME_LABELS[candidate]}
              </Text>
              {picked === candidate ? <Check color={palette.accent} size={18} weight="bold" /> : null}
            </Pressable>
          ))}
        </WorkspaceListGroup>
        <WorkspaceListGroup>
          {onOpenNotifications === undefined ? null : (
            <WorkspaceListRow onPress={onOpenNotifications} title="Notifications" />
          )}
          <Pressable
            accessibilityRole="button"
            onPress={onSignOut}
            style={({ pressed }) => [
              styles.row,
              { backgroundColor: pressed ? palette.surface2 : "transparent" },
            ]}
          >
            <SignOut color={palette.red} size={20} />
            <Text style={[typeStyle("md", { weight: 500 }), { color: palette.red }]}>Sign out</Text>
          </Pressable>
        </WorkspaceListGroup>
      </WorkspaceScreen>
    </WorkspaceTabShell>
  );
};

const styles = StyleSheet.create({
  content: {
    // Matches WorkspaceScreen's content gap, which no longer reaches these children.
    gap: spacing.s4,
  },
  row: {
    alignItems: "center",
    borderRadius: radii.md,
    flexDirection: "row",
    gap: spacing.s3,
    minHeight: 44,
    paddingHorizontal: spacing.s3,
  },
});

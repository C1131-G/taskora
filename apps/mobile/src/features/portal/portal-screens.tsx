import { Effect, Exit } from "effect";
import { useRef, useState } from "react";
import { withSkeleton } from "react-zero-skeleton";
import { StyleSheet, Text, View } from "react-native";
import { useQueryClient } from "@tanstack/react-query";

import { WorkspaceChip } from "@/components/workspace/workspace-chip";
import { failureMessage } from "@/components/workspace/workspace-error-state";
import { useErrorToast } from "@/components/workspace/error-toast-provider";
import { WorkspaceButton } from "@/components/workspace/workspace-button";
import { WorkspaceField } from "@/components/workspace/workspace-field";
import { WorkspaceLoadingRegion } from "@/components/workspace/workspace-loading";
import { WorkspaceTextInput } from "@/components/workspace/workspace-text-input";
import { WorkspaceScreen } from "@/components/workspace/workspace-screen";
import { PLACEHOLDER_PORTAL_PROJECTS } from "@/features/portal/portal-placeholders";
import { listPortalProjects, submitPortalBug } from "@/features/portal/queries";
import {
  draftToReport,
  EMPTY_REPORT_DRAFT,
  REPORT_IMPACTS,
  type ReportDraft,
} from "@/features/portal/report-form";
import { failureOf, useApi, useApiQuery, useKeys } from "@/runtime/api-hooks";
import { portalKeys } from "@/runtime/query-keys";
import { useTheme } from "@/theme/theme-provider";
import { typeStyle } from "@/theme/type-scale";
import { spacing, theme } from "@/theme/tokens.generated";

/** The report-a-bug form: what the client saw, where, and how bad it is. */
export const PortalNewBugScreen = ({ onDone }: { readonly onDone: () => void }) => {
  const api = useApi();
  const keys = useKeys();
  const queryClient = useQueryClient();
  const { isDark } = useTheme();
  const palette = isDark ? theme.dark : theme.light;
  const [draft, setDraft] = useState<ReportDraft>(EMPTY_REPORT_DRAFT);
  // The ref blocks a second press in the same frame; the state disables the button.
  const sendingRef = useRef(false);
  const [isSending, setIsSending] = useState(false);
  const showError = useErrorToast();

  const projects = useApiQuery({
    enabled: api !== null,
    program: api === null ? Effect.succeed({ projects: [] }) : listPortalProjects(api),
    queryKey: portalKeys.projects(),
  });
  const projectsLoading = api === null || projects.isPending;
  const choices = projects.data?.projects ?? [];
  // A client with a single project never has to pick it.
  const onlyProject = choices.length === 1 ? (choices[0]?.id ?? "") : "";
  const projectId = draft.projectId.length > 0 ? draft.projectId : onlyProject;

  const change = (patch: Partial<ReportDraft>): void => setDraft((previous) => ({ ...previous, ...patch }));

  const submit = (): void => {
    if (api === null || keys === null || sendingRef.current) {
      return;
    }
    const result = draftToReport({ ...draft, projectId });
    if (!result.ok) {
      showError(Object.values(result.fieldErrors).join(" ") || "Check the form");
      return;
    }
    sendingRef.current = true;
    setIsSending(true);
    void (async () => {
      const exit = await Effect.runPromiseExit(
        keys.run("portal-new-bug", (key) => submitPortalBug(api, key, result.body)),
      );
      if (Exit.isSuccess(exit)) {
        await queryClient.invalidateQueries({ queryKey: portalKeys.bugs() });
        onDone();
      } else {
        const failure = failureOf(exit);
        showError(failure === undefined ? "Could not send the report." : failureMessage(failure));
      }
      sendingRef.current = false;
      setIsSending(false);
    })();
  };

  return (
    <WorkspaceScreen title="Report a problem">
      <View style={styles.form}>
        <Field
          label="Title"
          onChange={(title) => change({ title })}
          value={draft.title}
        />
        <Field
          label="What you expected"
          multiline
          onChange={(expected) => change({ expected })}
          value={draft.expected}
        />
        <Field
          label="What happened"
          multiline
          onChange={(actual) => change({ actual })}
          value={draft.actual}
        />
        <Field
          label="Steps to reproduce, one per line"
          multiline
          onChange={(steps) => change({ steps })}
          value={draft.steps}
        />
        <Field
          label="Page address"
          onChange={(pageUrl) => change({ pageUrl })}
          value={draft.pageUrl}
        />
        <Text style={[typeStyle("sm", { weight: 500 }), { color: palette.text }]}>Impact</Text>
        <View style={styles.choices}>
          {REPORT_IMPACTS.map((impact) => (
            <WorkspaceChip
              accessibilityLabel={`Impact ${impact}`}
              color="gray"
              key={impact}
              label={impact}
              onPress={() => change({ impact })}
              selected={draft.impact === impact}
            />
          ))}
        </View>
        <Text style={[typeStyle("sm", { weight: 500 }), { color: palette.text }]}>Project</Text>
        {/* Bones reserve the chip row while projects load, so Send report does not jump. */}
        <WorkspaceLoadingRegion isLoading={projectsLoading} label="Loading projects">
          <SkelterProjectChips
            hasSkeleton={projectsLoading}
            isLoading={projectsLoading}
            onPick={(id) => change({ projectId: id })}
            projects={projectsLoading ? PLACEHOLDER_PORTAL_PROJECTS : choices}
            selectedId={projectId}
          />
        </WorkspaceLoadingRegion>
        <WorkspaceButton disabled={isSending} onPress={submit} size="lg">
          Send report
        </WorkspaceButton>
      </View>
    </WorkspaceScreen>
  );
};

const ProjectChips = ({
  onPick,
  projects,
  selectedId,
}: {
  readonly onPick: (id: string) => void;
  readonly projects: readonly { readonly id: string; readonly name: string }[];
  readonly selectedId: string;
}) => (
  <View style={styles.choices}>
    {projects.map((project) => (
      <WorkspaceChip
        accessibilityLabel={`Project ${project.name}`}
        color="gray"
        key={project.id}
        label={project.name}
        onPress={() => onPick(project.id)}
        selected={selectedId === project.id}
      />
    ))}
  </View>
);

const SkelterProjectChips = withSkeleton(ProjectChips);

const Field = (props: {
  readonly label: string;
  readonly multiline?: boolean;
  readonly onChange: (value: string) => void;
  readonly value: string;
}) => (
  <WorkspaceField label={props.label}>
    <WorkspaceTextInput
      accessibilityLabel={props.label}
      multiline={props.multiline === true}
      onChangeText={props.onChange}
      value={props.value}
    />
  </WorkspaceField>
);

const styles = StyleSheet.create({
  choices: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.s2,
  },
  form: {
    gap: spacing.s4,
  },
});

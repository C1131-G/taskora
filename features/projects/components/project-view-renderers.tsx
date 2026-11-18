/* eslint-disable shadcn/no-unknown-classes -- Project views use reference workspace styles. */

import type { ReactNode } from "react";

import { SuspenseReveal } from "@/components/ui/suspense-reveal";
import { ErrorToast } from "@/components/workspace/error-toast";
import { ProjectActivityFeed } from "@/features/activity/components/project-activity-feed";
import {
  ProjectApprovals,
  ProjectApprovalsSkeleton,
} from "@/features/approvals/components/project-approvals";
import { ProjectBugs } from "@/features/bugs/components/project-bugs";
import { ProjectAutomations } from "@/features/projects/components/project-automations";
import { ProjectBoard } from "@/features/projects/components/project-board";
import {
  ProjectBudgetPanel,
  ProjectBudgetPanelSkeleton,
} from "@/features/projects/components/project-budget-panel";
import { ProjectOverview } from "@/features/projects/components/project-overview";
import { ProjectTaskViews } from "@/features/projects/components/project-task-views";
import { TaskCreateForm } from "@/features/tasks/components/task-create-form";
import { readOrThrow } from "@/lib/read-result";

import type { ProjectViewContentProps } from "./project-view-shared";
import { ProjectFileView } from "./project-view-shared";

const renderProjectOverview = ({
  activityResult,
  currentUserId,
  employees,
  isAdmin,
  milestonePanel,
  project,
  taskResult,
  tasks,
  teams,
  today,
}: ProjectViewContentProps): ReactNode => {
  if (!taskResult?.ok) {
    throw new Error("Project tasks could not be loaded.");
  }
  return (
    <ProjectOverview
      activity={activityResult?.ok ? activityResult.data : []}
      activityUnavailable={!activityResult?.ok}
      budget={
        <SuspenseReveal
          fallback={<ProjectBudgetPanelSkeleton reserveSpace={isAdmin} />}
        >
          <ProjectBudgetPanel editable={isAdmin} projectId={project.id} />
        </SuspenseReveal>
      }
      currentUserId={currentUserId}
      employees={employees}
      isAdmin={isAdmin}
      milestones={milestonePanel}
      project={project}
      tasks={tasks}
      teams={teams}
      today={today}
    />
  );
};

const renderProjectBoard = ({
  currentUserId,
  employees,
  isAdmin,
  labelResult,
  project,
  taskResult,
  tasks,
}: ProjectViewContentProps): ReactNode => {
  if (!taskResult?.ok) {
    return <ErrorToast message="Tasks could not be loaded." />;
  }
  return (
    <ProjectBoard
      currentUserId={currentUserId}
      employees={employees}
      isAdmin={isAdmin}
      labels={labelResult.ok ? labelResult.data : []}
      projectKey={project.key}
      tasks={tasks}
      toolbarAction={<TaskCreateForm projectId={project.id} />}
    />
  );
};

const renderProjectFiles = ({
  currentUserId,
  fileResult,
  isAdmin,
  project,
}: ProjectViewContentProps): ReactNode => {
  if (!fileResult) {
    return null;
  }
  // Same card as a project on the Files page: a title row with the count.
  return (
    <section className="stack file-project">
      <div className="row">
        <h2>
          Files
          {fileResult.ok ? (
            <span className="file-count">{fileResult.data.length}</span>
          ) : null}
        </h2>
      </div>
      <ProjectFileView
        canUpload={isAdmin}
        currentUserId={currentUserId}
        isAdmin={isAdmin}
        projectId={project.id}
        result={fileResult}
      />
    </section>
  );
};

const renderProjectActivity = ({
  activityResult,
}: ProjectViewContentProps): ReactNode => (
  <ProjectActivityFeed
    entries={activityResult?.ok ? activityResult.data : []}
    error={!activityResult?.ok}
  />
);

const renderProjectApprovals = ({ project }: ProjectViewContentProps) => (
  <SuspenseReveal fallback={<ProjectApprovalsSkeleton />}>
    <ProjectApprovals projectId={project.id} />
  </SuspenseReveal>
);

const renderProjectBugs = ({
  bugResult,
  project,
}: ProjectViewContentProps): ReactNode => {
  if (!bugResult) {
    return null;
  }
  return (
    <ProjectBugs
      bugs={readOrThrow(bugResult, "Project bugs")}
      project={project}
    />
  );
};

const renderProjectAutomations = ({
  automationResult,
  employees,
  isAdmin,
  labelResult,
  project,
  runResult,
}: ProjectViewContentProps): ReactNode => {
  if (!isAdmin || !automationResult || !runResult) {
    return <ErrorToast message="Only administrators can manage automations." />;
  }
  return (
    <ProjectAutomations
      labels={(labelResult.ok ? labelResult.data : []).map(({ id, name }) => ({
        id,
        label: name,
      }))}
      people={employees.map(({ id, name }) => ({ id, label: name }))}
      projectId={project.id}
      rules={readOrThrow(automationResult, "Automations")}
      runs={readOrThrow(runResult, "The automation log")}
    />
  );
};

const renderProjectTasks = ({
  calendarEvents,
  calendarMode,
  calendarRange,
  currentUserId,
  customFieldTable,
  editableTaskIds,
  employees,
  isAdmin,
  labelResult,
  milestones,
  milestonesVersion,
  monthOffset,
  project,
  taskResult,
  tasks,
  timelineRange,
  view,
}: ProjectViewContentProps): ReactNode => {
  if (!taskResult?.ok) {
    throw new Error("Project tasks could not be loaded.");
  }
  return (
    <ProjectTaskViews
      calendarEvents={calendarEvents}
      calendarRange={calendarRange}
      calendarMode={calendarMode}
      currentUserId={currentUserId}
      customFieldTable={customFieldTable}
      editableTaskIds={editableTaskIds}
      employees={employees}
      isAdmin={isAdmin}
      labels={labelResult.ok ? labelResult.data : []}
      milestones={milestones}
      milestonesVersion={milestonesVersion}
      monthOffset={monthOffset}
      project={project}
      tasks={tasks}
      timelineRange={timelineRange}
      view={view}
    />
  );
};

export const projectViewRenderers: Readonly<
  Record<string, (props: ProjectViewContentProps) => ReactNode>
> = {
  activity: renderProjectActivity,
  approvals: renderProjectApprovals,
  automations: renderProjectAutomations,
  board: renderProjectBoard,
  bugs: renderProjectBugs,
  calendar: renderProjectTasks,
  files: renderProjectFiles,
  list: renderProjectTasks,
  overview: renderProjectOverview,
  table: renderProjectTasks,
  timeline: renderProjectTasks,
};

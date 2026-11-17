/* eslint-disable shadcn/no-unknown-classes, shadcn/no-inline-styles -- Project details use reference workspace styles. */

import { ViewSwitchTransition } from "@/components/ui/view-switch-transition";
import { ErrorToast } from "@/components/workspace/error-toast";
import { FavoriteToggle } from "@/features/discovery/components/favorite-toggle";
import { ProjectAdminControls } from "@/features/projects/components/project-admin-controls";
import { ProjectClientVisibility } from "@/features/projects/components/project-client-visibility";
import { ProjectIcon } from "@/features/projects/components/project-icon";
import { ProjectMemberAvatars } from "@/features/projects/components/project-list-layouts";
import { ProjectViewContent } from "@/features/projects/components/project-view-content";
import { ProjectViewTabs } from "@/features/projects/components/project-view-tabs";
import {
  getProjectBodyData,
  getProjectHeaderData,
} from "@/features/projects/project-detail-data";
import type { ProjectDetailQuery } from "@/features/projects/project-detail-data";
import { ProjectViewStoreProvider } from "@/features/projects/providers/project-view-store-provider";
import { TaskDrawerHost } from "@/features/tasks/components/task-drawer-host";

const ProjectHeader = async ({
  projectId,
  requestedView,
}: {
  readonly projectId: string;
  readonly requestedView: string;
}) => {
  const {
    employees,
    isAdmin,
    isFavorite,
    personalError,
    project,
    teams,
    view,
  } = await getProjectHeaderData(projectId, requestedView);
  const membersById = new Map(
    employees.map((employee) => [employee.id, employee] as const)
  );
  return (
    <div className="proj-h">
      <ErrorToast message={personalError} />
      <div className="row">
        <ProjectIcon color={project.color} icon={project.icon} />
        <span className="faint">Projects</span>
        <span className="sep">/</span>
        <h1>{project.name}</h1>
        <FavoriteToggle
          id={project.id}
          initialFavorite={isFavorite}
          kind="project"
        />
      </div>
      <p>{project.description || "Project workspace"}</p>
      <div className="row project-meta">
        <span className={`pstatus ${project.status}`}>{project.status}</span>
        <span className="muted">
          {project.startDate ?? "No start date"} —{" "}
          {project.dueDate ?? "No due date"}
        </span>
        {project.memberIds.length > 0 ? (
          <ProjectMemberAvatars
            memberIds={project.memberIds}
            membersById={membersById}
          />
        ) : null}
        {isAdmin ? (
          <>
            <ProjectAdminControls
              employees={employees}
              project={project}
              teams={teams}
            />
            <ProjectClientVisibility
              clientVisible={project.clientVisible}
              projectId={project.id}
              version={project.version}
            />
          </>
        ) : null}
      </div>
      <ProjectViewTabs
        isAdmin={isAdmin}
        projectId={project.id}
        selected={view}
      />
    </div>
  );
};

const ProjectBody = async ({
  initialTaskId,
  projectId,
  query,
}: {
  readonly initialTaskId: string | null;
  readonly projectId: string;
  readonly query: ProjectDetailQuery;
}) => {
  const {
    activityResult,
    automationResult,
    bugResult,
    calendarEvents,
    calendarMode,
    calendarRange,
    currentUserId,
    customFieldError,
    customFieldTable,
    editableTaskIds,
    employeeResult,
    fileResult,
    initialColumnWidths,
    isAdmin,
    labelResult,
    milestonePanel,
    milestones,
    milestonesVersion,
    monthOffset,
    project,
    preferencesError,
    runResult,
    taskResult,
    tasks,
    teamResult,
    timelineRange,
    today,
    view,
  } = await getProjectBodyData(projectId, query);
  const employees = employeeResult.ok ? employeeResult.data : [];
  return (
    <ProjectViewStoreProvider initialColumnWidths={initialColumnWidths}>
      <TaskDrawerHost
        currentUserId={currentUserId}
        editableTaskIds={[...editableTaskIds]}
        employees={employees}
        initialTaskId={initialTaskId}
        isAdmin={isAdmin}
        tasks={tasks}
      >
        <ErrorToast message={customFieldError} />
        <ErrorToast message={preferencesError} />
        <ErrorToast
          message={employeeResult.ok ? null : employeeResult.error.message}
        />
        <ErrorToast message={teamResult.ok ? null : teamResult.error.message} />
        <ErrorToast
          message={labelResult.ok ? null : labelResult.error.message}
        />
        <ViewSwitchTransition name="project-view" view={view}>
          <ProjectViewContent
            activityResult={activityResult}
            automationResult={automationResult}
            bugResult={bugResult}
            calendarEvents={calendarEvents}
            calendarMode={calendarMode}
            calendarRange={calendarRange}
            currentUserId={currentUserId}
            customFieldTable={customFieldTable}
            editableTaskIds={editableTaskIds}
            employees={employees}
            fileResult={fileResult}
            isAdmin={isAdmin}
            labelResult={labelResult}
            milestonePanel={milestonePanel}
            milestones={milestones}
            milestonesVersion={milestonesVersion}
            monthOffset={monthOffset}
            project={project}
            runResult={runResult}
            taskResult={taskResult}
            tasks={tasks}
            teams={teamResult.ok ? teamResult.data : []}
            timelineRange={timelineRange}
            today={today}
            view={view}
          />
        </ViewSwitchTransition>
      </TaskDrawerHost>
    </ProjectViewStoreProvider>
  );
};

export { ProjectBody, ProjectHeader };

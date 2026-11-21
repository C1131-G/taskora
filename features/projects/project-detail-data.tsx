import "server-only";
import { ErrorToast } from "@/components/workspace/error-toast";
import type { CalendarMode } from "@/features/calendar/calendar-params";
import { getPersonalWorkspace } from "@/features/discovery/discovery-queries";
import {
  listAllEmployees,
  listAllTeams,
} from "@/features/people/people-queries";
import { ProjectMilestones } from "@/features/projects/components/project-milestones";
import {
  getProject,
  listProjectMilestones,
} from "@/features/projects/projects-queries";
import { columnWidthsFromPreferences } from "@/features/tasks/task-table-columns";
import { listLabels } from "@/features/tasks/tasks-queries";
import { getPersonalPreferences } from "@/features/user/user-queries";
import { getPageSession } from "@/src/server/auth/page-session";
import { getCompanyToday } from "@/src/server/work/work-company-today";

import { loadProjectViewData } from "./project-view-fetchers";

export interface ProjectDetailQuery {
  readonly calendarMode: CalendarMode;
  readonly monthOffset: number;
  readonly view: string;
}

const resolveViewer = async (projectId: string, requestedView: string) => {
  const [session, project] = await Promise.all([
    getPageSession(),
    getProject(projectId),
  ]);
  const isAdmin =
    session.kind === "authenticated" && session.user.role === "admin";
  const currentUserId =
    session.kind === "authenticated" ? session.user.id : null;
  // Links to the removed saved views open the board.
  const activeView = requestedView.startsWith("saved-")
    ? "board"
    : requestedView;
  return {
    activeView,
    currentUserId,
    isAdmin,
    project,
  };
};

export const getProjectHeaderData = async (
  projectId: string,
  requestedView: string
) => {
  const [viewer, employeeResult, teamResult, personal] = await Promise.all([
    resolveViewer(projectId, requestedView),
    listAllEmployees(),
    listAllTeams(),
    getPersonalWorkspace({}),
  ]);
  const favoriteProjectIds = new Set(
    personal.ok ? personal.data.projects.map(({ id }) => id) : []
  );
  return {
    employees: employeeResult.ok ? employeeResult.data : [],
    isAdmin: viewer.isAdmin,
    isFavorite: favoriteProjectIds.has(viewer.project.id),
    personalError: personal.ok ? null : personal.error.message,
    project: viewer.project,
    teams: teamResult.ok ? teamResult.data : [],
    view: viewer.activeView,
  };
};

export const getProjectBodyData = async (
  projectId: string,
  query: ProjectDetailQuery
) => {
  const {
    activeView: view,
    currentUserId,
    isAdmin,
    project,
  } = await resolveViewer(projectId, query.view);
  const [
    employeeResult,
    milestoneResult,
    teamResult,
    labelResult,
    preferences,
    viewData,
  ] = await Promise.all([
    listAllEmployees(),
    listProjectMilestones({ projectId }),
    listAllTeams(),
    listLabels({}),
    getPersonalPreferences({}),
    loadProjectViewData({
      calendarMode: query.calendarMode,
      currentUserId,
      isAdmin,
      monthOffset: query.monthOffset,
      project,
      view,
    }),
  ]);
  const { calendarMode, monthOffset } = query;
  const milestonePanel = milestoneResult.ok ? (
    <ProjectMilestones
      editable={isAdmin}
      initialMilestones={milestoneResult.data.milestones}
      projectId={project.id}
      version={milestoneResult.data.version}
    />
  ) : (
    <ErrorToast message="Milestones could not be loaded." />
  );

  return {
    ...viewData,
    calendarMode,
    currentUserId,
    employeeResult,
    initialColumnWidths: columnWidthsFromPreferences(
      preferences.ok ? preferences.data.taskTableColumnWidths : undefined,
      viewData.customFieldTable?.fields.map(({ id }) => id)
    ),
    isAdmin,
    labelResult,
    milestonePanel,
    milestones: milestoneResult.ok ? milestoneResult.data.milestones : [],
    milestonesVersion: milestoneResult.ok ? milestoneResult.data.version : 0,
    monthOffset,
    preferencesError: preferences.ok ? null : preferences.error.message,
    project,
    teamResult,
    today: await getCompanyToday(),
    view,
  };
};

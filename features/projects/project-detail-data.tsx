/* eslint-disable shadcn/no-unknown-classes -- Project details use reference workspace styles. */

import { ErrorToast } from "@/components/workspace/error-toast";
import { listActivity } from "@/features/activity/activity-queries";
import { listBugs } from "@/features/bugs/bugs-queries";
import { calendarPeriod } from "@/features/calendar/calendar-params";
import type { CalendarMode } from "@/features/calendar/calendar-params";
import { listCalendarEvents } from "@/features/calendar/calendar-queries";
import { getProjectCustomFieldTable } from "@/features/custom-fields/custom-field-queries";
import { getPersonalWorkspace } from "@/features/discovery/discovery-queries";
import { listProjectFiles } from "@/features/files/files-queries";
import {
  listAllEmployees,
  listAllTeams,
} from "@/features/people/people-queries";
import {
  listAutomationRules,
  listAutomationRuns,
} from "@/features/projects/automation-queries";
import { ProjectMilestones } from "@/features/projects/components/project-milestones";
import {
  getProject,
  listProjectMilestones,
} from "@/features/projects/projects-queries";
import { columnWidthsFromPreferences } from "@/features/tasks/task-table-columns";
import {
  listLabels,
  listProjectTaskPages,
} from "@/features/tasks/tasks-queries";
import { getPersonalPreferences } from "@/features/user/user-queries";
import { currentUtcMonthRange } from "@/src/lib/utc-date-range";
import { getUtcToday } from "@/src/lib/utc-today";
import { getPageSession } from "@/src/server/auth/page-session";

const AUTOMATION_RUNS_SHOWN = 50;

type ProjectTasks = Extract<
  Awaited<ReturnType<typeof listProjectTaskPages>>,
  { readonly ok: true }
>["data"];

export interface ProjectDetailQuery {
  readonly calendarMode: CalendarMode;
  readonly monthOffset: number;
  readonly view: string;
}

const getEditableTaskIds = (
  tasks: ProjectTasks,
  isAdmin: boolean,
  currentUserId: string | null
) => {
  const editableTaskIds = new Set<string>();
  for (const task of tasks) {
    const canEdit =
      isAdmin ||
      task.createdById === currentUserId ||
      task.assigneeIds.includes(currentUserId ?? "");
    if (canEdit) {
      editableTaskIds.add(task.id);
    }
  }
  return editableTaskIds;
};

const loadProjectViewData = async ({
  calendarMode,
  isAdmin,
  monthOffset,
  project,
  currentUserId,
  view,
}: {
  readonly calendarMode: CalendarMode;
  readonly currentUserId: string | null;
  readonly isAdmin: boolean;
  readonly monthOffset: number;
  readonly project: Awaited<ReturnType<typeof getProject>>;
  readonly view: string;
}) => {
  const requiresTaskList = [
    "overview",
    "board",
    "list",
    "table",
    "calendar",
    "timeline",
  ].includes(view);
  const calendarRange =
    view === "calendar"
      ? calendarPeriod(calendarMode, monthOffset).range
      : null;
  const wantsAutomations = view === "automations" && isAdmin;
  const [
    taskResult,
    fileResult,
    activityResult,
    bugResult,
    calendarResult,
    automationResult,
    runResult,
    customFieldResult,
  ] = await Promise.all([
    requiresTaskList
      ? listProjectTaskPages(project.id, project.taskCount)
      : Promise.resolve(null),
    view === "files" ? listProjectFiles({ projectId: project.id }) : null,
    view === "activity" || view === "overview"
      ? listActivity({ limit: 100, projectId: project.id })
      : null,
    view === "bugs" ? listBugs({ projectId: project.id }) : null,
    calendarRange
      ? listCalendarEvents({
          from: calendarRange.fromInstant,
          to: calendarRange.toInstant,
        })
      : null,
    wantsAutomations ? listAutomationRules({ projectId: project.id }) : null,
    wantsAutomations
      ? listAutomationRuns({
          limit: AUTOMATION_RUNS_SHOWN,
          projectId: project.id,
        })
      : null,
    // Only the table has custom field columns.
    view === "table"
      ? getProjectCustomFieldTable({ projectId: project.id })
      : null,
  ]);
  const customFieldTable = customFieldResult?.ok
    ? customFieldResult.data
    : null;
  const tasks = taskResult?.ok ? taskResult.data : [];
  const editableTaskIds = getEditableTaskIds(tasks, isAdmin, currentUserId);
  const calendarEvents = calendarResult?.ok
    ? calendarResult.data.filter((event) => event.projectId === project.id)
    : null;
  const timelineRange = view === "timeline" ? currentUtcMonthRange(0, 4) : null;
  return {
    activityResult,
    automationResult,
    bugResult,
    calendarEvents,
    calendarRange,
    customFieldError:
      customFieldResult && !customFieldResult.ok
        ? customFieldResult.error.message
        : null,
    customFieldTable,
    editableTaskIds,
    fileResult,
    runResult,
    taskResult,
    tasks,
    timelineRange,
  };
};

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
    today: getUtcToday(),
    view,
  };
};

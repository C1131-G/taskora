import { listActivity } from "@/features/activity/activity-queries";
import { listBugs } from "@/features/bugs/bugs-queries";
import type { CalendarMode } from "@/features/calendar/calendar-params";
import { listCalendarEvents } from "@/features/calendar/calendar-queries";
import { getProjectCustomFieldTable } from "@/features/custom-fields/custom-field-queries";
import { listProjectFiles } from "@/features/files/files-queries";
import {
  listAutomationRules,
  listAutomationRuns,
} from "@/features/projects/automation-queries";
import type { getProject } from "@/features/projects/projects-queries";
import { listProjectTaskPages } from "@/features/tasks/tasks-queries";
import { currentUtcMonthRange } from "@/src/lib/utc-date-range";

import {
  AUTOMATION_RUNS_SHOWN,
  getCalendarRange,
  getEditableTaskIds,
  needsTaskList,
  wantsActivity,
  wantsAutomations,
  wantsBugs,
  wantsCustomFields,
  wantsFiles,
} from "./project-detail-shared";

type Project = Awaited<ReturnType<typeof getProject>>;
type CalendarRange = ReturnType<typeof getCalendarRange>;

const fetchTaskResult = (view: string, project: Project) =>
  needsTaskList(view)
    ? listProjectTaskPages(project.id, project.taskCount)
    : Promise.resolve(null);

const fetchFileResult = (view: string, project: Project) =>
  wantsFiles(view) ? listProjectFiles({ projectId: project.id }) : null;

const fetchActivityResult = (view: string, project: Project) =>
  wantsActivity(view)
    ? listActivity({ limit: 100, projectId: project.id })
    : null;

const fetchBugResult = (view: string, project: Project) =>
  wantsBugs(view) ? listBugs({ projectId: project.id }) : null;

const fetchCalendarResult = (calendarRange: CalendarRange) =>
  calendarRange
    ? listCalendarEvents({
        from: calendarRange.fromInstant,
        to: calendarRange.toInstant,
      })
    : null;

const fetchAutomationResult = (
  view: string,
  isAdmin: boolean,
  project: Project
) =>
  wantsAutomations(view, isAdmin)
    ? listAutomationRules({ projectId: project.id })
    : null;

const fetchRunResult = (view: string, isAdmin: boolean, project: Project) =>
  wantsAutomations(view, isAdmin)
    ? listAutomationRuns({
        limit: AUTOMATION_RUNS_SHOWN,
        projectId: project.id,
      })
    : null;

// Only the table has custom field columns.
const fetchCustomFieldResult = (view: string, project: Project) =>
  wantsCustomFields(view)
    ? getProjectCustomFieldTable({ projectId: project.id })
    : null;

export const loadProjectViewData = async ({
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
  const calendarRange = getCalendarRange(view, calendarMode, monthOffset);
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
    fetchTaskResult(view, project),
    fetchFileResult(view, project),
    fetchActivityResult(view, project),
    fetchBugResult(view, project),
    fetchCalendarResult(calendarRange),
    fetchAutomationResult(view, isAdmin, project),
    fetchRunResult(view, isAdmin, project),
    fetchCustomFieldResult(view, project),
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

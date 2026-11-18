import { calendarPeriod } from "@/features/calendar/calendar-params";
import type { CalendarMode } from "@/features/calendar/calendar-params";
import type { listProjectTaskPages } from "@/features/tasks/tasks-queries";
import { isOneOf } from "@/src/lib/type-guards";

export const AUTOMATION_RUNS_SHOWN = 50;

type ProjectTasks = Extract<
  Awaited<ReturnType<typeof listProjectTaskPages>>,
  { readonly ok: true }
>["data"];

export const getEditableTaskIds = (
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

const TASK_LIST_VIEWS = [
  "overview",
  "board",
  "list",
  "table",
  "calendar",
  "timeline",
] as const;

export const needsTaskList = (view: string) => isOneOf(TASK_LIST_VIEWS, view);

export const getCalendarRange = (
  view: string,
  calendarMode: CalendarMode,
  monthOffset: number
) =>
  view === "calendar" ? calendarPeriod(calendarMode, monthOffset).range : null;

export const wantsAutomations = (view: string, isAdmin: boolean) =>
  view === "automations" && isAdmin;

export const wantsFiles = (view: string) => view === "files";

export const wantsActivity = (view: string) =>
  view === "activity" || view === "overview";

export const wantsBugs = (view: string) => view === "bugs";

export const wantsCustomFields = (view: string) => view === "table";

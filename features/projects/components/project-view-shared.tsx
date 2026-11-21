/* eslint-disable shadcn/no-unknown-classes -- Project views use reference workspace styles. */

import type { ReactNode } from "react";

import { ErrorToast } from "@/components/workspace/error-toast";
import type { listActivity } from "@/features/activity/activity-queries";
import type { listBugs } from "@/features/bugs/bugs-queries";
import type { listCalendarEvents } from "@/features/calendar/calendar-queries";
import { ProjectFiles } from "@/features/files/components/project-files";
import type { listProjectFiles } from "@/features/files/files-queries";
import type {
  listAutomationRules,
  listAutomationRuns,
} from "@/features/projects/projects-automation-queries";
import type { listProjects } from "@/features/projects/projects-queries";
import type {
  listLabels,
  listProjectTasks,
} from "@/features/tasks/tasks-queries";
import type { currentUtcMonthRange } from "@/src/lib/utc-date-range";
import type { ProjectCustomFieldTable } from "@/src/server/custom-fields/custom-field-contracts";
import type { EmployeeDirectoryEntry } from "@/src/server/people/user-contracts";
import type { ProjectMilestone } from "@/src/server/projects/project-contracts";

export const ProjectFileView = ({
  result,
  projectId,
  canUpload,
  currentUserId,
  isAdmin,
}: {
  readonly result: Awaited<ReturnType<typeof listProjectFiles>>;
  readonly projectId: string;
  readonly canUpload: boolean;
  readonly currentUserId: string | null;
  readonly isAdmin: boolean;
}) => {
  if (result.ok) {
    return (
      <ProjectFiles
        canUpload={canUpload}
        currentUserId={currentUserId}
        initialFiles={result.data}
        isAdmin={isAdmin}
        projectId={projectId}
      />
    );
  }
  return <ErrorToast message="Project files could not be loaded." />;
};

type ProjectTaskActionResult = Awaited<ReturnType<typeof listProjectTasks>>;

type ProjectActivityActionResult = Awaited<ReturnType<typeof listActivity>>;

type ProjectCalendarActionResult = Awaited<
  ReturnType<typeof listCalendarEvents>
>;

type ProjectCalendarEvent = Extract<
  ProjectCalendarActionResult,
  { readonly ok: true }
>["data"][number];

type ProjectCalendarRange = ReturnType<typeof currentUtcMonthRange> | null;

export interface ProjectViewContentProps {
  readonly bugResult: Awaited<ReturnType<typeof listBugs>> | null;
  readonly activityResult: ProjectActivityActionResult | null;
  readonly automationResult: Awaited<
    ReturnType<typeof listAutomationRules>
  > | null;
  readonly runResult: Awaited<ReturnType<typeof listAutomationRuns>> | null;
  readonly calendarEvents: readonly ProjectCalendarEvent[] | null;
  readonly calendarMode: "month" | "week";
  readonly calendarRange: ProjectCalendarRange;
  readonly currentUserId: string | null;
  readonly customFieldTable: ProjectCustomFieldTable | null;
  readonly editableTaskIds: ReadonlySet<string>;
  readonly employees: readonly EmployeeDirectoryEntry[];
  readonly fileResult: Awaited<ReturnType<typeof listProjectFiles>> | null;
  readonly labelResult: Awaited<ReturnType<typeof listLabels>>;
  readonly isAdmin: boolean;
  readonly milestonePanel: ReactNode;
  readonly milestones: readonly ProjectMilestone[];
  readonly milestonesVersion: number;
  readonly monthOffset: number;
  readonly project: NonNullable<
    Extract<
      Awaited<ReturnType<typeof listProjects>>,
      { readonly ok: true }
    >["data"][number]
  >;
  readonly taskResult: ProjectTaskActionResult | null;
  readonly tasks: Extract<
    ProjectTaskActionResult,
    { readonly ok: true }
  >["data"];
  readonly teams: readonly { readonly id: string; readonly name: string }[];
  readonly timelineRange: ProjectCalendarRange;
  readonly today: string;
  readonly view: string;
}

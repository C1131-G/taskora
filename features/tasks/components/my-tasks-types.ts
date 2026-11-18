/* eslint-disable shadcn/no-unknown-classes */

import type { ProjectTaskListItem } from "@/src/server/work/work-contracts";

export interface AssignedTask extends Omit<
  ProjectTaskListItem,
  "completionUndo" | "recurrenceSuccessorId"
> {
  readonly projectId: string;
  readonly projectKey: string;
  readonly projectName: string;
}

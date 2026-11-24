import type { ReactNode } from "react";

import type { EmployeeDirectoryEntry } from "@/src/server/people/user-contracts";
import type { ProjectTaskListItem } from "@/src/server/work/work-contracts";

export type GlobalTask = Omit<
  ProjectTaskListItem,
  "completionUndo" | "recurrenceSuccessorId"
> & {
  readonly projectKey: string;
  readonly projectName: string;
};

interface TaskGroup {
  readonly key: string;
  readonly label: string;
  readonly tasks: readonly GlobalTask[];
}

export interface GlobalTaskRowsProps {
  readonly taskGroups: readonly TaskGroup[];
  readonly favoriteTaskIds: ReadonlySet<string>;
  readonly employees: readonly EmployeeDirectoryEntry[];
  readonly userId: string | null;
  readonly isAdmin: boolean;
  readonly view: "list" | "board" | "table";
  // Shown at the start of the selection bar so the view switch and the
  // selection controls share one line.
  readonly viewSwitch?: ReactNode;
}

interface TaskSelectionProps {
  readonly selectedIds: ReadonlySet<string>;
  readonly onToggle: (taskId: string, checked: boolean) => void;
}

export type GlobalTaskViewProps = GlobalTaskRowsProps & TaskSelectionProps;

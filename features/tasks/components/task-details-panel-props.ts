import type { ReactNode } from "react";

import type {
  EmployeeOption,
  TaskBundle,
} from "@/features/tasks/task-details-panel-data";

export interface TaskDetailsPanelProps {
  readonly currentUserId: string | null;
  readonly bugId?: string;
  readonly editable: boolean;
  readonly employees: readonly EmployeeOption[];
  // The server's read for a deep-linked task, used for the first load only.
  readonly initialBundlePromise?: Promise<TaskBundle> | null;
  readonly isAdmin: boolean;
  // When open is passed, the caller owns the open state (for example a drawer
  // driven by the URL). Otherwise the trigger opens the panel.
  readonly onOpenChange?: (open: boolean) => void;
  readonly onVersionChange: (version: number) => void;
  readonly open?: boolean;
  readonly projectId: string;
  readonly taskId: string;
  readonly taskType?: "task" | "bug";
  readonly taskTitle?: string;
  readonly trigger?: ReactNode;
  readonly version: number;
}

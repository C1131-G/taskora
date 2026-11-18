/* eslint-disable shadcn/no-inline-styles, shadcn/no-restyle, shadcn/no-unknown-classes */

import { Badge } from "@/components/ui/badge";
import { useTaskDrawer } from "@/features/tasks/components/task-drawer";
import { TaskManageControls } from "@/features/tasks/components/task-manage-controls";
import { TaskStatusSelect } from "@/features/tasks/components/task-status-select";
import type { TaskTableColumn } from "@/features/tasks/task-table-columns";
import type { LabelSummary } from "@/src/server/tasks/label-management";
import type { ProjectTaskListItem } from "@/src/server/work/work-contracts";

export type ProjectTaskTableItem = Pick<
  ProjectTaskListItem,
  | "assignees"
  | "assigneeIds"
  | "createdById"
  | "description"
  | "dependencyIds"
  | "dueDate"
  | "estimate"
  | "id"
  | "labelIds"
  | "priority"
  | "projectId"
  | "projectTaskNumber"
  | "recurrence"
  | "startDate"
  | "status"
  | "title"
  | "version"
>;

const DATE_FORMATTER = new Intl.DateTimeFormat("en", {
  day: "numeric",
  month: "short",
  timeZone: "UTC",
  year: "numeric",
});

const formatDate = (date: string | null): string => {
  if (!date) {
    return "—";
  }
  return DATE_FORMATTER.format(new Date(`${date}T12:00:00Z`));
};

export const ProjectTaskCell = ({
  column,
  currentUserId,
  editable,
  employees,
  isAdmin,
  labelsById,
  projectKey,
  task,
  todayKey,
}: {
  readonly column: TaskTableColumn;
  readonly currentUserId: string | null;
  readonly editable: boolean;
  readonly employees: readonly { readonly id: string; readonly name: string }[];
  readonly isAdmin: boolean;
  readonly labelsById: ReadonlyMap<string, LabelSummary>;
  readonly projectKey: string;
  readonly task: ProjectTaskTableItem;
  readonly todayKey: string;
}) => {
  const drawer = useTaskDrawer();
  switch (column.id) {
    case "task": {
      return (
        <div className="mtt-task-inner">
          <button
            className="mtt-title"
            onClick={() => drawer?.openTask(task.id)}
            onFocus={() => drawer?.prefetchTask(task.id)}
            onPointerEnter={() => drawer?.prefetchTask(task.id)}
            title={`Open ${task.title}`}
            type="button"
          >
            {task.title}
          </button>
          <span className="mono mtt-key">
            {projectKey}-{task.projectTaskNumber}
          </span>
        </div>
      );
    }
    case "status": {
      return editable ? (
        <TaskStatusSelect
          status={task.status}
          taskId={task.id}
          version={task.version}
        />
      ) : (
        <span className={`pstatus ${task.status}`}>{task.status}</span>
      );
    }
    case "priority": {
      return (
        <span className={`mtt-priority prio-${task.priority}`}>
          {task.priority}
        </span>
      );
    }
    case "assignees": {
      return task.assignees.length
        ? task.assignees.map((assignee) => assignee.name).join(", ")
        : "Unassigned";
    }
    case "start": {
      return formatDate(task.startDate);
    }
    case "due": {
      const overdue =
        task.status !== "done" &&
        task.dueDate !== null &&
        task.dueDate < todayKey;
      return (
        <span className={`mtt-due${overdue ? " is-overdue" : ""}`}>
          {formatDate(task.dueDate)}
        </span>
      );
    }
    case "estimate": {
      return task.estimate ?? "—";
    }
    case "labels": {
      const taskLabels = task.labelIds.flatMap((id) => {
        const label = labelsById.get(id);
        return label ? [label] : [];
      });
      return (
        <span className="project-task-labels">
          {taskLabels.length
            ? taskLabels.map((label) => (
                <Badge
                  key={label.id}
                  style={{ borderColor: label.color, color: label.color }}
                  variant="outline"
                >
                  {label.name}
                </Badge>
              ))
            : "—"}
        </span>
      );
    }
    case "dependencies": {
      return task.dependencyIds.length
        ? `${task.dependencyIds.length} task${task.dependencyIds.length === 1 ? "" : "s"}`
        : "—";
    }
    case "actions": {
      return (
        <TaskManageControls
          canEdit={editable}
          currentUserId={currentUserId}
          employees={employees}
          isAdmin={isAdmin}
          task={task}
        />
      );
    }
    default: {
      const _exhaustive: never = column;
      return _exhaustive;
    }
  }
};

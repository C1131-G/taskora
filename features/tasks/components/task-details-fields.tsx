/* eslint-disable shadcn/no-unknown-classes */
/* eslint-disable shadcn/no-restyle */

import {
  WorkspaceInput,
  WorkspaceTextarea,
} from "@/components/workspace/workspace-controls";
import { WorkspaceDatePicker } from "@/components/workspace/workspace-date-picker";
import {
  WorkspaceSelect,
  WorkspaceSelectItem,
} from "@/components/workspace/workspace-select";
import type { TaskDetailsDraft } from "@/features/tasks/task-details-draft";
import {
  TASK_STATUS_ORDER,
  TASK_STATUSES,
} from "@/src/mobile-api/task-statuses";

const TASK_PRIORITIES: readonly TaskDetailsDraft["priority"][] = [
  "urgent",
  "high",
  "medium",
  "low",
  "none",
];

// The title, description, status, priority, dates and estimate of a task.
export const TaskDetailsFields = ({
  draft,
  editable,
  onPatch,
  taskId,
}: {
  readonly draft: TaskDetailsDraft;
  readonly editable: boolean;
  readonly onPatch: (values: Partial<TaskDetailsDraft>) => void;
  readonly taskId: string;
}) => {
  const fieldId = (name: string) => `task-${taskId}-${name}`;

  return (
    <>
      <label className="field" htmlFor={fieldId("title")}>
        <span>Title</span>
        <WorkspaceInput
          className="input"
          disabled={!editable}
          id={fieldId("title")}
          maxLength={200}
          onChange={(event) => onPatch({ title: event.currentTarget.value })}
          required
          value={draft.title}
        />
      </label>
      <label className="field" htmlFor={fieldId("description")}>
        <span>Description</span>
        <WorkspaceTextarea
          className="input"
          disabled={!editable}
          id={fieldId("description")}
          maxLength={10_000}
          onChange={(event) =>
            onPatch({ description: event.currentTarget.value })
          }
          placeholder="Add more detail so others know what to do…"
          rows={4}
          value={draft.description}
        />
      </label>
      <div className="row">
        <label className="field" htmlFor={fieldId("status")}>
          <span>Status</span>
          <WorkspaceSelect
            className="input"
            disabled={!editable}
            id={fieldId("status")}
            onValueChange={(value) => {
              const status = TASK_STATUS_ORDER.find(
                (candidate) => candidate === value
              );
              if (status) {
                onPatch({ status });
              }
            }}
            value={draft.status}
          >
            {TASK_STATUSES.map(({ id, label }) => (
              <WorkspaceSelectItem key={id} value={id}>
                {label}
              </WorkspaceSelectItem>
            ))}
          </WorkspaceSelect>
        </label>
        <label className="field" htmlFor={fieldId("priority")}>
          <span>Priority</span>
          <WorkspaceSelect
            className="input"
            disabled={!editable}
            id={fieldId("priority")}
            onValueChange={(value) => {
              const priority = TASK_PRIORITIES.find(
                (candidate) => candidate === value
              );
              if (priority) {
                onPatch({ priority });
              }
            }}
            value={draft.priority}
          >
            <WorkspaceSelectItem value="urgent">Urgent</WorkspaceSelectItem>
            <WorkspaceSelectItem value="high">High</WorkspaceSelectItem>
            <WorkspaceSelectItem value="medium">Medium</WorkspaceSelectItem>
            <WorkspaceSelectItem value="low">Low</WorkspaceSelectItem>
            <WorkspaceSelectItem value="none">No priority</WorkspaceSelectItem>
          </WorkspaceSelect>
        </label>
      </div>
      <div className="row">
        <label className="field" htmlFor={fieldId("start")}>
          <span>Start date</span>
          <WorkspaceDatePicker
            className="input"
            disabled={!editable}
            id={fieldId("start")}
            onValueChange={(value) => onPatch({ startDate: value || null })}
            value={draft.startDate}
          />
        </label>
        <label className="field" htmlFor={fieldId("due")}>
          <span>Due date</span>
          <WorkspaceDatePicker
            className="input"
            disabled={!editable}
            id={fieldId("due")}
            onValueChange={(value) => onPatch({ dueDate: value || null })}
            value={draft.dueDate}
          />
        </label>
        <label className="field" htmlFor={fieldId("estimate")}>
          <span>Estimate</span>
          <WorkspaceInput
            className="input"
            disabled={!editable}
            id={fieldId("estimate")}
            maxLength={40}
            onChange={(event) =>
              onPatch({ estimate: event.currentTarget.value })
            }
            placeholder="e.g. 2h"
            value={draft.estimate}
          />
        </label>
      </div>
    </>
  );
};

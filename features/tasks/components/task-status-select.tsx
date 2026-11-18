/* eslint-disable shadcn/no-unknown-classes */
/* eslint-disable shadcn/no-restyle */

"use client";

import { useOptimistic } from "react";
import { toast } from "sonner";

import {
  WorkspaceSelect,
  WorkspaceSelectItem,
} from "@/components/workspace/workspace-select";
import { useWorkspaceUndo } from "@/components/workspace/workspace-undo";
import {
  changeTaskColumnAction,
  undoTaskCompletionAction,
} from "@/features/tasks/tasks-actions";
import { useToastTransition } from "@/hooks/use-toast-transition";
import { TASK_STATUSES } from "@/src/mobile-api/task-statuses";
import type { TaskStatusId } from "@/src/mobile-api/task-statuses";

type TaskStatus = TaskStatusId;

const TaskStatusSelect = ({
  taskId,
  version,
  status,
}: {
  readonly taskId: string;
  readonly version: number;
  readonly status: TaskStatus;
}) => {
  const { addUndo } = useWorkspaceUndo();
  const [pending, startTransition] = useToastTransition(
    "The task status could not be changed. Try again."
  );
  // The select shows the new status at once; the action's refresh brings the
  // saved status, and a refused change falls back to it with the error shown.
  const [shownStatus, setShownStatus] = useOptimistic(status);

  const changeStatus = (nextStatus: TaskStatus) => {
    if (pending || nextStatus === shownStatus) {
      return;
    }
    startTransition(async () => {
      setShownStatus(nextStatus);
      const result = await changeTaskColumnAction({
        expectedVersion: version,
        idempotencyKey: crypto.randomUUID(),
        status: nextStatus,
        taskId,
      });
      if (!result.ok) {
        toast.error(result.error.message);
        return;
      }
      const { completionUndo } = result.data;
      if (completionUndo) {
        addUndo({
          expiresAt: completionUndo.expiresAt,
          label: "Task completed",
          run: async () => {
            const undoResult = await undoTaskCompletionAction({
              idempotencyKey: crypto.randomUUID(),
              undoId: completionUndo.undoId,
            });
            if (!undoResult.ok) {
              return undoResult.error.message;
            }
            return null;
          },
        });
      }
    });
  };

  return (
    <div className="status-control-wrap">
      <label className="status-control">
        <span className="sr">Change task status</span>
        <WorkspaceSelect
          className="pstatus"
          disabled={pending}
          onValueChange={(nextStatus) => {
            const selectedStatus = TASK_STATUSES.find(
              ({ id }) => id === nextStatus
            )?.id;
            if (selectedStatus) {
              changeStatus(selectedStatus);
            }
          }}
          status={shownStatus}
          value={shownStatus}
        >
          {TASK_STATUSES.map(({ id: value, label }) => (
            <WorkspaceSelectItem key={value} value={value}>
              {label}
            </WorkspaceSelectItem>
          ))}
        </WorkspaceSelect>
      </label>
    </div>
  );
};

export { TaskStatusSelect };

/* eslint-disable shadcn/no-unknown-classes */
/* eslint-disable shadcn/no-restyle */

"use client";

import { useActionState, useEffect, useRef, useState } from "react";

import { ErrorToast } from "@/components/workspace/error-toast";
import { WorkspaceButton } from "@/components/workspace/workspace-button";
import { TaskAssigneesFieldset } from "@/features/tasks/components/task-assignees-fieldset";
import type { TaskEmployeeOption } from "@/features/tasks/components/task-assignees-fieldset";
import { TaskDetailsFields } from "@/features/tasks/components/task-details-fields";
import type {
  EditableTask,
  TaskDetailsDraft,
} from "@/features/tasks/task-details-draft";
import {
  draftFromTask,
  isDraftDirty,
} from "@/features/tasks/task-details-draft";
import { updateTaskAction } from "@/features/tasks/tasks-actions";

export const TaskDetailsForm = ({
  editable,
  employees,
  onDirtyChange,
  onReload,
  onSaved,
  task,
  version,
  versionIsCurrent,
}: {
  readonly editable: boolean;
  readonly employees: readonly TaskEmployeeOption[];
  readonly onDirtyChange: (dirty: boolean) => void;
  readonly onReload: () => void;
  readonly onSaved: (
    version: number,
    completionUndo: {
      readonly undoId: string;
      readonly expiresAt: string;
    } | null
  ) => void;
  readonly task: EditableTask;
  // The panel keeps this current, so a save after a subtask edit is not a conflict.
  readonly version: number;
  readonly versionIsCurrent: boolean;
}) => {
  const [draft, setDraft] = useState(() => draftFromTask(task));
  const [assigneeSearch, setAssigneeSearch] = useState("");
  const [error, setError] = useState<{
    readonly conflict: boolean;
    readonly message: string;
  } | null>(null);
  const [errorRevision, setErrorRevision] = useState(0);
  const submissionInFlight = useRef(false);
  const dirty = isDraftDirty(draft, task);

  // Dirty state is reported from the change handlers, not from an effect, so the
  // panel never re-renders just to mirror the form. The form unmounts from
  // several parent paths (tab switch, reload, drawer close), so the unmount
  // itself clears the flag instead of each of those handlers.
  useEffect(
    function clearDirtyOnUnmount() {
      return function reportClean() {
        onDirtyChange(false);
      };
    },
    [onDirtyChange]
  );

  const patch = (values: Partial<TaskDetailsDraft>) => {
    const next = { ...draft, ...values };
    setDraft(next);
    onDirtyChange(isDraftDirty(next, task));
  };
  const toggleAssignee = (employeeId: string, checked: boolean) => {
    const others = draft.assigneeIds.filter((id) => id !== employeeId);
    patch({
      assigneeIds: checked ? [...others, employeeId].toSorted() : others,
    });
  };

  const [, saveAction, pending] = useActionState(
    async (_previous: null, _formData: FormData) => {
      if (!versionIsCurrent) {
        return null;
      }
      if (submissionInFlight.current) {
        return null;
      }
      submissionInFlight.current = true;
      try {
        const result = await updateTaskAction({
          assigneeIds: draft.assigneeIds,
          description: draft.description.trim() || null,
          dueDate: draft.dueDate,
          estimate: draft.estimate.trim() || null,
          expectedVersion: version,
          idempotencyKey: crypto.randomUUID(),
          priority: draft.priority,
          startDate: draft.startDate,
          status: draft.status,
          taskId: task.id,
          title: draft.title.trim(),
        });
        if (result.ok) {
          setError(null);
          onSaved(result.data.version, result.data.completionUndo ?? null);
        } else {
          setError({
            conflict: result.error.code === "CONFLICT",
            message: result.error.message,
          });
          setErrorRevision((revision) => revision + 1);
        }
      } catch {
        setError({
          conflict: false,
          message: "Task details could not be saved. Try again.",
        });
        setErrorRevision((revision) => revision + 1);
      }
      submissionInFlight.current = false;
      return null;
    },
    null
  );

  let saveLabel = "No changes to save";
  if (pending) {
    saveLabel = "Saving…";
  } else if (dirty) {
    saveLabel = "Save changes";
  }

  return (
    <form action={saveAction} className="stack">
      <TaskDetailsFields
        draft={draft}
        editable={editable}
        onPatch={patch}
        taskId={task.id}
      />
      <TaskAssigneesFieldset
        editable={editable}
        employees={employees}
        onSearchChange={setAssigneeSearch}
        onToggle={toggleAssignee}
        search={assigneeSearch}
        selectedIds={draft.assigneeIds}
        taskId={task.id}
      />
      <ErrorToast
        action={
          error?.conflict
            ? { label: "Reload task", onClick: onReload }
            : undefined
        }
        message={error?.message}
        resetKey={errorRevision}
      />
      <ErrorToast
        action={{ label: "Reload task", onClick: onReload }}
        message={
          versionIsCurrent
            ? null
            : "This task changed while you were editing it. Reload the task before saving."
        }
      />
      {editable ? (
        <WorkspaceButton
          className="btn btn-primary"
          disabled={pending || !dirty || !versionIsCurrent}
          type="submit"
        >
          {saveLabel}
        </WorkspaceButton>
      ) : null}
    </form>
  );
};

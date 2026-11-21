/* eslint-disable shadcn/no-unknown-classes, shadcn/no-inline-styles */
/* eslint-disable shadcn/no-restyle */

"use client";

import { useTransition } from "react";
import { toast } from "sonner";

import { WorkspaceButton } from "@/components/workspace/workspace-button";
import {
  TaskRelationsSection,
  TaskRelationsSkeleton,
} from "@/features/tasks/components/task-relations-section";
import type {
  TaskLabelOption,
  TaskRelationOption,
} from "@/features/tasks/components/task-relations-section";
import { setTaskRelationsAction } from "@/features/tasks/tasks-actions";

// The labels and the project's other tasks a task can be linked to. The task
// panel reads them with the rest of the task, so this editor only displays them.
export interface RelationChoices {
  readonly dependencies: readonly TaskRelationOption[];
  readonly labels: readonly TaskLabelOption[];
}

export const TaskRelationsEditor = ({
  taskId,
  version,
  onReload,
  labelIds,
  dependencyIds,
  editable,
  choices,
  loading,
  onVersionChange,
}: {
  readonly taskId: string;
  readonly version: number;
  readonly labelIds: readonly string[];
  readonly dependencyIds: readonly string[];
  readonly editable: boolean;
  // Null until the panel has read them, or when that read failed.
  readonly choices: RelationChoices | null;
  readonly loading: boolean;
  readonly onVersionChange: (version: number) => void;
  readonly onReload: () => Promise<void>;
}) => {
  const [pending, startTransition] = useTransition();

  const save = (formData: FormData) => {
    if (pending || !editable) {
      return;
    }
    startTransition(async () => {
      try {
        const result = await setTaskRelationsAction({
          dependencyTaskIds: formData.getAll("dependencyTaskIds").map(String),
          expectedVersion: version,
          idempotencyKey: crypto.randomUUID(),
          labelIds: formData.getAll("labelIds").map(String),
          taskId,
        });
        if (!result.ok) {
          toast.error(result.error.message);
          return;
        }
        onVersionChange(result.data.version);
        await onReload();
      } catch {
        toast.error(
          "Task relations could not be saved or refreshed. Try again."
        );
      }
    });
  };

  const retry = () => {
    startTransition(async () => {
      await onReload();
    });
  };

  let content = <TaskRelationsSkeleton editable={editable} />;
  if (choices) {
    content = (
      <TaskRelationsSection
        dependencies={choices.dependencies}
        editable={editable}
        labels={choices.labels}
        onSave={save}
        pending={pending}
        selectedDependencyIds={dependencyIds}
        selectedLabelIds={labelIds}
      />
    );
  } else if (!loading) {
    content = (
      <WorkspaceButton
        disabled={pending}
        onClick={retry}
        type="button"
        workspace
      >
        Retry
      </WorkspaceButton>
    );
  }
  return <section className="stack">{content}</section>;
};

/* eslint-disable shadcn/no-unknown-classes, shadcn/no-inline-styles */
/* eslint-disable shadcn/no-restyle */

"use client";

import { useCallback, useEffect, useRef, useState, useTransition } from "react";
import { toast } from "sonner";

import { WorkspaceButton } from "@/components/workspace/workspace-button";
import { TaskRelationsSection } from "@/features/tasks/components/task-relations-section";
import type {
  TaskLabelOption,
  TaskRelationOption,
} from "@/features/tasks/components/task-relations-section";
import {
  listLabelsAction,
  listProjectTasksAction,
  setTaskRelationsAction,
} from "@/features/tasks/tasks-actions";

export const TaskRelationsEditor = ({
  taskId,
  projectId,
  version,
  onReload,
  labelIds,
  dependencyIds,
  editable,
  onVersionChange,
}: {
  readonly taskId: string;
  readonly projectId: string;
  readonly version: number;
  readonly labelIds: readonly string[];
  readonly dependencyIds: readonly string[];
  readonly editable: boolean;
  readonly onVersionChange: (version: number) => void;
  readonly onReload: () => Promise<void>;
}) => {
  const [pending, startTransition] = useTransition();
  const [loaded, setLoaded] = useState(false);
  const [labels, setLabels] = useState<readonly TaskLabelOption[]>([]);
  const [dependencies, setDependencies] = useState<
    readonly TaskRelationOption[]
  >([]);
  const [loadFailed, setLoadFailed] = useState(false);
  const loadSequence = useRef(0);

  const load = useCallback(() => {
    loadSequence.current += 1;
    const requestId = loadSequence.current;
    startTransition(async () => {
      setLoaded(false);
      setLoadFailed(false);
      try {
        const [labelResult, taskResult] = await Promise.all([
          listLabelsAction({}),
          listProjectTasksAction({ limit: 200, offset: 0, projectId }),
        ]);
        if (requestId !== loadSequence.current) {
          return;
        }
        if (labelResult.ok && taskResult.ok) {
          setLabels(labelResult.data);
          const options: TaskRelationOption[] = [];
          for (const task of taskResult.data) {
            if (task.id !== taskId) {
              options.push({
                id: task.id,
                name: `${task.title} · ${task.status}`,
              });
            }
          }
          setDependencies(options);
          setLoaded(true);
          return;
        }
        const messages = [labelResult, taskResult].flatMap((result) =>
          result.ok ? [] : [result.error.message]
        );
        setLoadFailed(true);
        toast.error(
          [...new Set(messages)].join(" ") ||
            "Labels and dependencies could not be loaded."
        );
      } catch {
        if (requestId !== loadSequence.current) {
          return;
        }
        setLoadFailed(true);
        toast.error("Labels and dependencies could not be loaded. Try again.");
      }
    });
  }, [projectId, taskId]);

  // Labels and dependencies load as soon as the section appears, so there is no
  // extra button to press before the choices show.
  useEffect(() => {
    load();
    return () => {
      loadSequence.current += 1;
    };
  }, [load]);

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

  let content = (
    <output className="muted">Loading labels and dependencies…</output>
  );
  if (loaded) {
    content = (
      <TaskRelationsSection
        dependencies={dependencies}
        editable={editable}
        labels={labels}
        onSave={save}
        pending={pending}
        selectedDependencyIds={dependencyIds}
        selectedLabelIds={labelIds}
      />
    );
  } else if (loadFailed) {
    content = (
      <WorkspaceButton
        disabled={pending}
        onClick={load}
        type="button"
        workspace
      >
        Retry
      </WorkspaceButton>
    );
  }
  return <section className="stack">{content}</section>;
};

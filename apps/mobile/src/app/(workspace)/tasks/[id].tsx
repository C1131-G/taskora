import { Effect } from "effect";
import { useLocalSearchParams } from "expo-router";

import { WorkspaceEmptyState } from "@/components/workspace/workspace-empty-state";
import { WorkspaceErrorState } from "@/components/workspace/workspace-error-state";
import { TaskDetailScreen, type TaskDetailModel } from "@/features/tasks/task-screens";
import { getTaskContext, type MobileTaskContext } from "@/features/tasks/queries";
import { useApi, useApiQuery, useKeys } from "@/runtime/api-hooks";
import type { AppFailure } from "@/errors";

/** Typical-length detail so Skelter sizes its bones like a real task. */
const PLACEHOLDER_TASK_DETAIL: TaskDetailModel = {
  projectName: "Website relaunch",
  status: "progress",
  subtasks: [
    { completed: true, id: "placeholder-subtask-1", title: "Draft new pricing tiers copy" },
    { completed: false, id: "placeholder-subtask-2", title: "Get sign-off from marketing" },
    { completed: false, id: "placeholder-subtask-3", title: "Publish and check on mobile" },
  ],
  title: "Update pricing page copy for Q1",
  version: 0,
};

const toTaskDetailModel = (detail: MobileTaskContext | null): TaskDetailModel =>
  detail === null
    ? PLACEHOLDER_TASK_DETAIL
    : {
        projectName: detail.projectName,
        status: detail.status,
        subtasks: detail.subtasks.map((subtask) => ({
          completed: subtask.completed,
          id: subtask.id,
          title: subtask.title,
        })),
        title: detail.title,
        version: detail.version,
      };

export default function TaskDetailRoute() {
  const api = useApi();
  const keys = useKeys();
  const params = useLocalSearchParams<{ id: string }>();
  const id = typeof params.id === "string" ? params.id : "";

  const program: Effect.Effect<MobileTaskContext | null, AppFailure> =
    api === null || id.length === 0 ? Effect.succeed(null) : getTaskContext(api, id);

  const task = useApiQuery({
    enabled: api !== null && id.length > 0,
    program,
    queryKey: ["tasks", id, "detail"],
  });

  // Only a missing id is an incomplete link; a null api/keys is a session still restoring.
  if (id.length === 0) {
    return <WorkspaceEmptyState message="This task link is incomplete." title="No task" />;
  }
  if (task.error !== null) {
    return <WorkspaceErrorState failure={task.error} onRetry={() => void task.refetch()} />;
  }

  const isLoading = api === null || keys === null || task.isPending;
  const detail = task.data ?? null;
  if (!isLoading && detail === null) {
    return <WorkspaceEmptyState message="This task no longer exists." title="No task" />;
  }

  return (
    <TaskDetailScreen
      api={api}
      isLoading={isLoading}
      keys={keys}
      task={toTaskDetailModel(detail)}
      taskId={id}
    />
  );
}

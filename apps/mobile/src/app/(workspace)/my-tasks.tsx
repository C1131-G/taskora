import { Effect } from "effect";
import { useRouter } from "expo-router";

import { WorkspaceErrorState } from "@/components/workspace/workspace-error-state";
import { WorkspaceTabShell } from "@/features/navigation/workspace-tabs";
import { MyTasksScreen, type TaskRowModel } from "@/features/tasks/task-screens";
import { getMyWork } from "@/features/tasks/queries";
import { useApi, useApiQuery } from "@/runtime/api-hooks";
import { taskKeys } from "@/runtime/query-keys";
import type { AppFailure } from "@/errors";

interface PageModel {
  readonly tasks: readonly TaskRowModel[];
}

/** Typical-length rows so Skelter sizes its bones like real tasks. */
const PLACEHOLDER_TASKS = [
  {
    dueAt: "2026-11-18",
    id: "placeholder-task-1",
    priority: "high",
    projectName: "Website relaunch",
    status: "todo",
    title: "Update pricing page copy for Q1",
  },
  {
    dueAt: "2026-11-20",
    id: "placeholder-task-2",
    priority: "medium",
    projectName: "Mobile onboarding",
    status: "progress",
    title: "Fix checkout validation on iOS",
  },
  {
    dueAt: "2026-11-25",
    id: "placeholder-task-3",
    priority: "medium",
    projectName: "Customer portal",
    status: "review",
    title: "Review homepage hero redesign",
  },
] satisfies readonly TaskRowModel[];

export default function MyTasksRoute() {
  const api = useApi();
  const router = useRouter();

  const program: Effect.Effect<PageModel, AppFailure> =
    api === null
      ? Effect.succeed<PageModel>({ tasks: [] })
      : Effect.map(getMyWork(api), (work) => ({
          tasks: work.items.map((item) => ({
            dueAt: item.dueDate,
            id: item.id,
            priority: item.priority,
            projectName: item.projectName,
            status: item.status,
            title: item.title,
          })),
        }));

  const tasks = useApiQuery({
    enabled: api !== null,
    program,
    queryKey: taskKeys.mine(),
  });

  const isLoading = api === null || tasks.isPending;
  // Cached tasks stay on screen when a background refresh fails.
  if (tasks.error !== null && tasks.data === undefined) {
    return <WorkspaceErrorState failure={tasks.error} onRetry={() => void tasks.refetch()} />;
  }

  return (
    <WorkspaceTabShell>
      <MyTasksScreen
        isLoading={isLoading}
        onOpenTask={(id) => router.push(`/tasks/${id}`)}
        tasks={tasks.data?.tasks ?? PLACEHOLDER_TASKS}
      />
    </WorkspaceTabShell>
  );
}

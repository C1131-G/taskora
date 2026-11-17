/* eslint-disable shadcn/no-unknown-classes -- Workspace classes are defined in apps/web/app/workspace-styles. */

"use client";

import { Plus } from "@phosphor-icons/react/dist/ssr";

import { SkeletonBone } from "@/components/workspace/skeleton-shapes";
import { TaskTableSkeleton } from "@/components/workspace/task-table-skeleton";
import { WorkspaceButton } from "@/components/workspace/workspace-button";
import { SearchParamFallback } from "@/features/projects/components/search-param-fallback";
import { GlobalTaskFilterBarSkeleton } from "@/features/tasks/components/global-task-filter-bar";

const MY_TASK_VIEW_LABELS = [
  ["list", "List"],
  ["calendar", "Calendar"],
] as const;

// The loading state is the real page frame: header, New task, the view links and
// the filter row stay as they are (inert); the subtitle counts tasks, so it is a
// bone. Most people have projects, so the New task button keeps its slot.
const MyTasksSkeletonFrame = ({
  view,
}: {
  readonly view: "calendar" | "list";
}) => (
  <>
    <div className="ph my-tasks-header">
      <div>
        <h1 aria-hidden="true">My Tasks</h1>
        <p aria-hidden="true" className="min-h-lh">
          <SkeletonBone shape="short" />
        </p>
      </div>
      <WorkspaceButton
        aria-hidden="true"
        inert
        size="sm"
        type="button"
        variant="default"
      >
        <Plus aria-hidden="true" size={14} />
        New task
      </WorkspaceButton>
      <nav aria-hidden="true" className="row" inert>
        {MY_TASK_VIEW_LABELS.map(([value, label]) => (
          <WorkspaceButton
            key={value}
            size="sm"
            tabIndex={-1}
            type="button"
            variant={view === value ? "default" : "secondary"}
          >
            {label}
          </WorkspaceButton>
        ))}
      </nav>
    </div>
    <GlobalTaskFilterBarSkeleton
      idPrefix="my-tasks"
      searchLabel="Search my tasks"
      showGroup={false}
    />
    {view === "list" ? <TaskTableSkeleton /> : null}
  </>
);

// The view comes from the URL, read on the client so the skeleton commits in
// the static shell.
const MyTasksSkeleton = () => (
  <SearchParamFallback
    cases={{ calendar: <MyTasksSkeletonFrame view="calendar" /> }}
    fallback={<MyTasksSkeletonFrame view="list" />}
    name="view"
  />
);

export { MyTasksSkeleton };

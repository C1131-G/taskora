/* eslint-disable shadcn/no-unknown-classes, shadcn/no-restyle -- Loading frame uses workspace CSS token classes. */

"use client";

import { useSearchParams } from "next/navigation";
import {
  createContext,
  Suspense,
  useContext,
  useMemo,
  useRef,
  useState,
} from "react";
import type { ReactNode } from "react";

import { SectionErrorBoundary } from "@/components/ui/section-error-boundary";
import { Sheet, SheetContent } from "@/components/ui/sheet";
import { useHydrated } from "@/components/workspace/use-hydrated";
import { TaskDetailsHeading } from "@/features/tasks/components/task-details-heading";
import { TaskDetailsPanel } from "@/features/tasks/components/task-details-panel";
import type { TaskBundle } from "@/features/tasks/task-details-panel-data";
import { getTaskBundleAction } from "@/features/tasks/tasks-actions";

interface DrawerTask {
  readonly bugId?: string;
  readonly id: string;
  readonly projectId: string;
  readonly title: string;
  readonly type?: "task" | "bug";
  readonly version: number;
}

interface EmployeeOption {
  readonly id: string;
  readonly name: string;
}

export interface TaskDrawerProviderProps {
  readonly children: ReactNode;
  readonly currentUserId: string | null;
  readonly editableTaskIds: readonly string[];
  readonly employees: readonly EmployeeOption[];
  // The server's unawaited read of the deep-linked task, if any.
  readonly initialTaskBundlePromise?: Promise<TaskBundle> | null;
  // The ?task= value the server saw, so a deep link renders on the first response.
  readonly initialTaskId: string | null;
  readonly isAdmin: boolean;
  readonly tasks: readonly DrawerTask[];
}

interface TaskDrawerValue {
  readonly openTask: (taskId: string) => void;
  // Starts reading a task before it is opened, so a click finds the data ready.
  readonly prefetchTask: (taskId: string) => void;
}

const TaskDrawerContext = createContext<TaskDrawerValue | null>(null);

// Null outside a drawer host, so a row can fall back to its own panel.
export const useTaskDrawer = (): TaskDrawerValue | null =>
  useContext(TaskDrawerContext);

// Mirrors the open task into ?task=<id> without a server round trip. The server
// reads the same param on load, so a reload or a shared link reopens the task.
// Other params, such as the view, are kept.
const writeTaskParam = (taskId: string | null) => {
  const url = new URL(window.location.href);
  if (taskId) {
    url.searchParams.set("task", taskId);
  } else {
    url.searchParams.delete("task");
  }
  const next = `${url.pathname}${url.search}${url.hash}`;
  if (
    next !==
    `${window.location.pathname}${window.location.search}${window.location.hash}`
  ) {
    window.history.replaceState(null, "", next);
  }
};

// Shown for the instant before a task's data arrives: the real drawer frame and
// title with a thin progress line, not placeholder bones.
const TaskDrawerShell = ({
  onClose,
  title,
}: {
  readonly onClose: () => void;
  readonly title: string;
}) => (
  <Sheet
    onOpenChange={(next) => {
      if (!next) {
        onClose();
      }
    }}
    open
  >
    <SheetContent
      aria-busy="true"
      className="workspace-app"
      data-task-drawer=""
      data-workspace-sheet=""
      side="right"
    >
      <TaskDetailsHeading isBug={false} title={title} />
      <div aria-hidden="true" className="task-drawer-progress" />
    </SheetContent>
  </Sheet>
);

// One drawer per page. The task list comes from the server page, so the drawer
// can open any task on the page, including from a deep link.
export const TaskDrawerProvider = ({
  children,
  currentUserId,
  editableTaskIds,
  employees,
  initialTaskBundlePromise = null,
  initialTaskId,
  isAdmin,
  tasks,
}: TaskDrawerProviderProps) => {
  const hydrated = useHydrated();
  // The modal portal hides sibling navigation, so mount it after React has
  // reconciled the server-rendered workspace shell.
  // Next.js syncs native history changes with useSearchParams when its router
  // state is copied into the replacement entry.
  const selectedId = useSearchParams().get("task");
  const selected = tasks.find((task) => task.id === selectedId) ?? null;
  // Used once: after the deep-linked task closes, or another task opens, the
  // panel reads fresh data itself. Held in state so a server refresh's new
  // promise does not replace it.
  const [bundleTaskId, setBundleTaskId] = useState(initialTaskId);
  const [initialBundlePromise, setInitialBundlePromise] = useState(
    initialTaskBundlePromise
  );
  const [versionOverride, setVersionOverride] = useState<{
    readonly sourceVersion: number;
    readonly taskId: string;
    readonly value: number;
  } | null>(null);
  const prefetched = useRef(new Map<string, Promise<TaskBundle>>());
  const value = useMemo<TaskDrawerValue>(() => {
    const readBundle = (task: DrawerTask) => {
      const cached = prefetched.current.get(task.id);
      if (cached) {
        return cached;
      }
      const request = getTaskBundleAction(task.projectId, task.id, task.bugId);
      prefetched.current.set(task.id, request);
      return request;
    };
    return {
      openTask: (taskId) => {
        const task = tasks.find((item) => item.id === taskId);
        if (!task) {
          return;
        }
        setBundleTaskId(task.id);
        setInitialBundlePromise(readBundle(task));
        // A reopened task reads fresh data rather than a stale prefetch.
        prefetched.current.delete(task.id);
        writeTaskParam(taskId);
      },
      prefetchTask: (taskId) => {
        const task = tasks.find((item) => item.id === taskId);
        if (task) {
          readBundle(task);
        }
      },
    };
  }, [setBundleTaskId, setInitialBundlePromise, tasks]);

  const editable = selected ? editableTaskIds.includes(selected.id) : false;
  const version =
    selected &&
    versionOverride?.taskId === selected.id &&
    versionOverride.sourceVersion === selected.version
      ? versionOverride.value
      : (selected?.version ?? 0);

  return (
    <TaskDrawerContext.Provider value={value}>
      {children}
      {hydrated && selected ? (
        <SectionErrorBoundary title="Task details couldn't load">
          <Suspense
            fallback={
              <TaskDrawerShell
                onClose={() => {
                  setInitialBundlePromise(null);
                  setBundleTaskId(null);
                  writeTaskParam(null);
                }}
                title={selected.title}
              />
            }
          >
            <TaskDetailsPanel
              currentUserId={currentUserId}
              editable={editable}
              employees={employees}
              initialBundlePromise={
                selected.id === bundleTaskId ? initialBundlePromise : null
              }
              isAdmin={isAdmin}
              key={selected.id}
              onOpenChange={(next) => {
                if (!next) {
                  setInitialBundlePromise(null);
                  setBundleTaskId(null);
                  writeTaskParam(null);
                }
              }}
              onVersionChange={(nextVersion) =>
                setVersionOverride({
                  sourceVersion: selected.version,
                  taskId: selected.id,
                  value: nextVersion,
                })
              }
              open
              projectId={selected.projectId}
              taskId={selected.id}
              {...(selected.bugId ? { bugId: selected.bugId } : {})}
              taskType={selected.type ?? "task"}
              taskTitle={selected.title}
              version={version}
            />
          </Suspense>
        </SectionErrorBoundary>
      ) : null}
    </TaskDrawerContext.Provider>
  );
};

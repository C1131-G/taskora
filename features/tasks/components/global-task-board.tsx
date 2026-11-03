/* eslint-disable jsx-a11y/no-noninteractive-element-interactions, shadcn/no-unknown-classes */

"use client";

import Link from "next/link";
import { useOptimistic, useRef, useState, useTransition } from "react";
import { toast } from "sonner";

import { Checkbox } from "@/components/ui/checkbox";
import { FavoriteToggle } from "@/features/discovery/components/favorite-toggle";
import { BoardCardTransition } from "@/features/tasks/components/board-card-transition";
import { TaskManageControls } from "@/features/tasks/components/task-manage-controls";
import { TaskStatusSelect } from "@/features/tasks/components/task-status-select";
import { withTaskStatus } from "@/features/tasks/task-status-move";
import { changeTaskColumnAction } from "@/features/tasks/tasks-actions";
import type { EmployeeDirectoryEntry } from "@/src/server/people/user-contracts";
import type { ProjectTaskListItem } from "@/src/server/work/work-contracts";

type GlobalTask = Omit<
  ProjectTaskListItem,
  "completionUndo" | "recurrenceSuccessorId"
> & {
  readonly projectKey: string;
  readonly projectName: string;
};

interface TaskGroup {
  readonly key: string;
  readonly tasks: readonly GlobalTask[];
}

const TASK_STATUSES = [
  { id: "backlog", label: "Backlog" },
  { id: "todo", label: "To Do" },
  { id: "progress", label: "In Progress" },
  { id: "review", label: "Review" },
  { id: "done", label: "Done" },
] as const;

// Keep drag highlights outside React so re-renders do not cancel a drag.
const clearOver = () => {
  for (const card of document.querySelectorAll(".gt-card.is-dragging")) {
    card.classList.remove("is-dragging");
  }
  for (const column of document.querySelectorAll(
    ".global-task-board .is-over"
  )) {
    column.classList.remove("is-over");
  }
};

export const GlobalTaskBoard = ({
  taskGroups,
  favoriteTaskIds,
  employees,
  userId,
  isAdmin,
  selectedIds,
  onToggle,
}: {
  readonly taskGroups: readonly TaskGroup[];
  readonly favoriteTaskIds: ReadonlySet<string>;
  readonly employees: readonly EmployeeDirectoryEntry[];
  readonly userId: string | null;
  readonly isAdmin: boolean;
  readonly selectedIds: ReadonlySet<string>;
  readonly onToggle: (taskId: string, checked: boolean) => void;
}) => {
  const draggedTaskId = useRef<string | null>(null);
  // The card that was just dropped plays a short settle animation in its new column.
  const [droppedId, setDroppedId] = useState<string | null>(null);
  const moveInFlight = useRef(false);
  const [pending, startTransition] = useTransition();
  // A dropped card sits in its new column at once; a refused move falls back.
  const [tasks, showMove] = useOptimistic(
    taskGroups.flatMap((group) => group.tasks),
    withTaskStatus<GlobalTask>
  );
  const moveTask = (status: (typeof TASK_STATUSES)[number]["id"]) => {
    if (pending || moveInFlight.current) {
      return;
    }
    const task = tasks.find(({ id }) => id === draggedTaskId.current);
    draggedTaskId.current = null;
    if (!task || task.status === status) {
      return;
    }
    const mayMove =
      isAdmin ||
      task.createdById === userId ||
      task.assigneeIds.includes(userId ?? "");
    if (!mayMove) {
      toast.error("You don't have access to move this task.");
      return;
    }
    setDroppedId(task.id);
    window.setTimeout(() => setDroppedId(null), 900);
    moveInFlight.current = true;
    startTransition(async () => {
      showMove({ status, taskId: task.id });
      try {
        const result = await changeTaskColumnAction({
          expectedVersion: task.version,
          idempotencyKey: crypto.randomUUID(),
          status,
          taskId: task.id,
        });
        if (!result.ok) {
          toast.error(result.error.message);
        }
      } catch {
        toast.error("Task could not be moved. Try again.");
      }
      moveInFlight.current = false;
    });
  };

  return (
    <div className="project-board-wrap global-task-board-wrap">
      <div aria-busy={pending} className="board global-task-board">
        {TASK_STATUSES.map((status) => {
          const statusTasks = tasks.filter((task) => task.status === status.id);
          return (
            <section
              aria-label={`${status.label}, ${statusTasks.length} tasks`}
              className="bcol"
              key={status.id}
            >
              <header className="bcol-h">
                <span aria-hidden="true" className={`st ${status.id}`} />
                <span>{status.label}</span>
                <span className="cnt">{statusTasks.length}</span>
              </header>
              <div
                className="bcol-b"
                onDragLeave={(event) => {
                  if (
                    !event.currentTarget.contains(event.relatedTarget as Node)
                  ) {
                    event.currentTarget.parentElement?.classList.remove(
                      "is-over"
                    );
                  }
                }}
                onDragOver={(event) => {
                  event.preventDefault();
                  event.dataTransfer.dropEffect = "move";
                  event.currentTarget.parentElement?.classList.add("is-over");
                }}
                onDrop={(event) => {
                  event.preventDefault();
                  clearOver();
                  moveTask(status.id);
                }}
              >
                {statusTasks.map((task) => {
                  const canEdit =
                    isAdmin ||
                    task.createdById === userId ||
                    task.assigneeIds.includes(userId ?? "");
                  return (
                    <BoardCardTransition key={task.id} taskId={task.id}>
                      <article
                        className={`kcard gt-card${task.status === "done" ? " done" : ""}${droppedId === task.id ? " just-dropped" : ""}${canEdit ? "" : " is-locked"}`}
                        draggable={canEdit && !pending}
                        title={
                          canEdit
                            ? undefined
                            : "You don't have access to move this task"
                        }
                        onDragEnd={(event) => {
                          draggedTaskId.current = null;
                          event.currentTarget.classList.remove("is-dragging");
                          clearOver();
                        }}
                        onDragStart={(event) => {
                          draggedTaskId.current = task.id;
                          event.dataTransfer.effectAllowed = "move";
                          event.dataTransfer.setData("text/plain", task.id);
                          const card = event.currentTarget;
                          // After the browser has taken its drag image.
                          window.setTimeout(
                            () => card.classList.add("is-dragging"),
                            0
                          );
                        }}
                      >
                        <div className="gt-card-top">
                          <Checkbox
                            aria-label={`Select ${task.title}`}
                            checked={selectedIds.has(task.id)}
                            onCheckedChange={(checked) =>
                              onToggle(task.id, checked === true)
                            }
                          />
                          <span className="key">
                            {task.projectKey}-{task.projectTaskNumber}
                          </span>
                          <span className="gt-card-actions">
                            <FavoriteToggle
                              id={task.id}
                              initialFavorite={favoriteTaskIds.has(task.id)}
                              kind="task"
                            />
                            <TaskManageControls
                              canEdit={canEdit}
                              currentUserId={userId}
                              employees={employees}
                              isAdmin={isAdmin}
                              task={task}
                            />
                          </span>
                        </div>
                        <h3 className="title gt-card-title">
                          <Link href={`/projects/${task.projectId}?view=board`}>
                            {task.title}
                          </Link>
                        </h3>
                        <p className="gt-card-project">{task.projectName}</p>
                        <div className="gt-card-meta">
                          {task.priority === "none" ? null : (
                            <span
                              className={`mtt-priority prio-${task.priority}`}
                            >
                              {task.priority}
                            </span>
                          )}
                          {task.dueDate ? (
                            <time
                              className="gt-card-due"
                              dateTime={task.dueDate}
                            >
                              {task.dueDate}
                            </time>
                          ) : null}
                          <span className="sp" />
                          <span
                            className="gt-card-people"
                            title={
                              task.assignees
                                .map(({ name }) => name)
                                .join(", ") || "Unassigned"
                            }
                          >
                            {task.assignees.slice(0, 3).map((assignee) => (
                              <span
                                aria-hidden="true"
                                className="gt-avatar"
                                key={assignee.id}
                              >
                                {assignee.name.slice(0, 1).toUpperCase()}
                              </span>
                            ))}
                            <span className="sr-only">
                              {task.assignees
                                .map(({ name }) => name)
                                .join(", ") || "Unassigned"}
                            </span>
                          </span>
                        </div>
                        {canEdit ? (
                          <div className="gt-card-status">
                            <TaskStatusSelect
                              status={task.status}
                              taskId={task.id}
                              version={task.version}
                            />
                          </div>
                        ) : null}
                      </article>
                    </BoardCardTransition>
                  );
                })}
              </div>
            </section>
          );
        })}
      </div>
    </div>
  );
};

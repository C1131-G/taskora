/* eslint-disable shadcn/no-unknown-classes */
/* eslint-disable shadcn/no-restyle */

"use client";

import { use, useState } from "react";

import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { TaskApprovals } from "@/features/approvals/components/task-approvals";
import { BugTaskDetail } from "@/features/bugs/components/bug-task-detail";
import { TaskCustomFields } from "@/features/custom-fields/components/task-custom-fields";
import { TaskCommentsSection } from "@/features/tasks/components/task-details-comments";
import { TaskDetailsHeading } from "@/features/tasks/components/task-details-heading";
import type { TaskDetailsPanelProps } from "@/features/tasks/components/task-details-panel-props";
import { TaskDiscardDialog } from "@/features/tasks/components/task-discard-dialog";
import { TaskDrawerTabs } from "@/features/tasks/components/task-drawer-tabs";
import type { TaskDrawerTab } from "@/features/tasks/components/task-drawer-tabs";
import {
  TaskBugExtras,
  TaskFilesSection,
} from "@/features/tasks/components/task-panel-sections";
import { TaskPanelError } from "@/features/tasks/components/task-panel-support";
import { isVersionCurrent } from "@/features/tasks/components/task-panel-version";
import { TaskWorkSections } from "@/features/tasks/components/task-work-sections";
import { useTaskBundle } from "@/features/tasks/hooks/use-task-bundle";
import { useTaskPanelOpen } from "@/features/tasks/hooks/use-task-panel-open";
import { useTaskPanelSave } from "@/features/tasks/hooks/use-task-panel-save";
import { useTaskSubtaskActions } from "@/features/tasks/hooks/use-task-subtask-actions";
import { TaskTimeSection } from "@/features/time/components/task-time-section";

/* eslint-disable react-doctor/no-giant-component -- This component coordinates the task drawer state while its sections stay delegated to focused components. */

// One panel per task. Everything it edits is read from the server when it opens,
// so a caller only needs the task's ID, project and version. Closing with unsaved
// details or a comment draft asks first.
export const TaskDetailsPanel = ({
  currentUserId,
  bugId,
  editable,
  employees,
  initialBundlePromise = null,
  isAdmin,
  onOpenChange,
  onVersionChange,
  open,
  projectId,
  taskId,
  taskType = "task",
  taskTitle,
  trigger,
  version,
}: TaskDetailsPanelProps) => {
  // A deep-link bundle is resolved by the nearest Suspense boundary before
  // the panel mounts; its rejection is handled by the section boundary.
  const initialBundle = initialBundlePromise ? use(initialBundlePromise) : null;
  const [trustedVersion, setTrustedVersion] = useState<number | null>(null);
  const recordVersionChange = (nextVersion: number) => {
    setTrustedVersion(nextVersion);
    onVersionChange(nextVersion);
  };
  const [tab, setTab] = useState<TaskDrawerTab>("details");
  const isBug = taskType === "bug";
  // Set only when this panel shows a bug, so bug-only reads and views key off it.
  const bugDetailId = isBug ? bugId : undefined;
  const {
    approvals,
    comments,
    bugHistory,
    customFields,
    dependencyChoices,
    error,
    errorRevision,
    files,
    labelChoices,
    loading,
    pulls,
    refresh,
    setFiles,
    setSubtasks,
    subtasks,
    task,
    time,
    timer,
  } = useTaskBundle({
    initialBundle,
    projectId,
    taskId,
    ...(bugDetailId ? { bugId: bugDetailId } : {}),
  });
  const subtaskActions = useTaskSubtaskActions({
    onVersionChange: recordVersionChange,
    setSubtasks,
    subtasks,
    taskId,
    version,
  });
  // Only a bug reported by a client company can take public replies.
  const allowPublicReplies =
    isBug && typeof bugHistory?.bug.clientCompanyId === "string";
  const {
    react: handleReact,
    remove: handleRemoveComment,
    setBody: handleCommentBodyChange,
    setVisibility: handleVisibilityChange,
    submit: handleSubmitComment,
  } = comments;
  const handleSaved = useTaskPanelSave({
    onVersionChange: recordVersionChange,
    refresh,
    taskTitle: task?.title ?? taskTitle ?? "task",
  });

  const {
    discardAndClose,
    discardOpen,
    isOpen,
    requestOpenChange,
    setDetailsDirty,
    setDiscardOpen,
  } = useTaskPanelOpen({
    commentDraft: {
      hasText: Boolean(comments.body.trim()),
      reset: () => {
        comments.setBody("");
        comments.setVisibility("internal");
      },
    },
    hasInitialBundle: Boolean(initialBundle),
    onOpenChange,
    open,
    refresh,
  });

  const renderWorkSections = (part: "details" | "subtasks" | "client") => (
    <TaskWorkSections
      editable={editable}
      employees={employees}
      onDirtyChange={setDetailsDirty}
      onReload={() => refresh()}
      onSaved={handleSaved}
      onVersionChange={recordVersionChange}
      part={part}
      relationChoices={
        labelChoices && dependencyChoices
          ? { dependencies: dependencyChoices, labels: labelChoices }
          : null
      }
      relationChoicesLoading={loading}
      subtaskActions={subtaskActions}
      subtasks={subtasks}
      task={task}
      taskId={taskId}
      version={version}
      versionIsCurrent={isVersionCurrent(task, version, trustedVersion)}
    />
  );

  return (
    <section className="task-details-panel">
      <Sheet onOpenChange={requestOpenChange} open={isOpen}>
        {trigger === undefined ? null : (
          <SheetTrigger asChild>{trigger}</SheetTrigger>
        )}
        <SheetContent
          className="workspace-app"
          data-task-drawer=""
          data-task-editable={editable || undefined}
          data-workspace-sheet=""
          side="right"
        >
          <TaskDetailsHeading
            isBug={isBug}
            title={task?.title ?? taskTitle ?? "Task details"}
          />
          <div className="task-drawer-body min-h-0 flex-1 overflow-y-auto px-5 pb-6">
            {bugDetailId ? null : (
              <TaskDrawerTabs
                active={tab}
                counts={{
                  comments: comments.comments.length,
                  files: files.length,
                  subtasks: subtasks.length,
                }}
                onChange={setTab}
              />
            )}
            <div className="task-drawer-panel space-y-5 pt-4">
              <TaskPanelError
                loading={loading}
                message={error}
                onRetry={refresh}
                revision={errorRevision}
              />
              {bugDetailId ? (
                <BugTaskDetail
                  employees={employees}
                  history={bugHistory}
                  isAdmin={isAdmin}
                  onRefresh={refresh}
                  userId={currentUserId ?? ""}
                />
              ) : null}
              {bugDetailId ? null : (
                <div hidden={tab !== "details"}>
                  {renderWorkSections("details")}
                  <TaskCustomFields
                    customFields={customFields}
                    onChanged={refresh}
                    taskId={taskId}
                  />
                </div>
              )}
              {bugDetailId ? null : (
                <div hidden={tab !== "subtasks"}>
                  {renderWorkSections("subtasks")}
                </div>
              )}
              <div hidden={tab !== "time" && !bugDetailId}>
                <TaskTimeSection
                  currentUserId={currentUserId}
                  isAdmin={isAdmin}
                  onChanged={refresh}
                  taskId={taskId}
                  taskTitle={taskTitle}
                  time={time}
                  timer={timer}
                />
              </div>
              <div hidden={tab !== "comments" && !bugDetailId}>
                <TaskCommentsSection
                  allowPublicReplies={allowPublicReplies}
                  body={comments.body}
                  comments={comments.comments}
                  currentUserId={currentUserId}
                  employees={employees}
                  isAdmin={isAdmin}
                  onBodyChange={handleCommentBodyChange}
                  onReact={handleReact}
                  onRemove={handleRemoveComment}
                  onSubmit={handleSubmitComment}
                  onVisibilityChange={handleVisibilityChange}
                  pending={comments.pending}
                  visibility={comments.visibility}
                />
              </div>
              <div hidden={tab !== "files" && !bugDetailId}>
                <TaskFilesSection
                  currentUserId={currentUserId}
                  editable={editable}
                  files={files}
                  isAdmin={isAdmin}
                  projectId={projectId}
                  pulls={pulls}
                  setFiles={setFiles}
                  taskId={taskId}
                />
              </div>
              {bugDetailId ? null : (
                <div hidden={tab !== "client"}>
                  {renderWorkSections("client")}
                  <TaskApprovals
                    approvals={approvals}
                    files={files}
                    onChanged={refresh}
                    taskId={taskId}
                  />
                </div>
              )}
              {bugDetailId ? (
                <TaskBugExtras
                  approvals={approvals}
                  customFields={customFields}
                  files={files}
                  onChanged={refresh}
                  pulls={pulls}
                  taskId={taskId}
                />
              ) : null}
            </div>
          </div>
        </SheetContent>
      </Sheet>
      <TaskDiscardDialog
        onDiscard={discardAndClose}
        onOpenChange={setDiscardOpen}
        open={discardOpen}
      />
    </section>
  );
};

/* eslint-disable shadcn/no-unknown-classes */
/* eslint-disable shadcn/no-restyle */

"use client";

import { use, useState } from "react";
import type { ReactNode } from "react";

import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { ErrorToast } from "@/components/workspace/error-toast";
import { TaskApprovals } from "@/features/approvals/components/task-approvals";
import { BugTaskDetail } from "@/features/bugs/components/bug-task-detail";
import { TaskCustomFields } from "@/features/custom-fields/components/task-custom-fields";
import { ProjectFiles } from "@/features/files/components/project-files";
import { TaskLinkedPulls } from "@/features/github/components/task-linked-pulls";
import { TaskCommentsSection } from "@/features/tasks/components/task-details-comments";
import { TaskDetailsHeading } from "@/features/tasks/components/task-details-heading";
import { TaskDiscardDialog } from "@/features/tasks/components/task-discard-dialog";
import { TaskDrawerTabs } from "@/features/tasks/components/task-drawer-tabs";
import type { TaskDrawerTab } from "@/features/tasks/components/task-drawer-tabs";
import { TaskWorkSections } from "@/features/tasks/components/task-work-sections";
import { useTaskBundle } from "@/features/tasks/hooks/use-task-bundle";
import { useTaskPanelOpen } from "@/features/tasks/hooks/use-task-panel-open";
import { useTaskPanelSave } from "@/features/tasks/hooks/use-task-panel-save";
import { useTaskSubtaskActions } from "@/features/tasks/hooks/use-task-subtask-actions";
import type {
  EmployeeOption,
  TaskBundle,
} from "@/features/tasks/task-details-panel-data";
import { TaskTimeSection } from "@/features/time/components/task-time-section";

const TaskPanelError = ({
  message,
  onRetry,
  revision,
}: {
  readonly loading: boolean;
  readonly message: string | null;
  readonly onRetry: () => void;
  readonly revision: number;
}) => (
  <ErrorToast
    action={{ label: "Retry", onClick: onRetry }}
    message={message}
    resetKey={revision}
  />
);

// The panel may edit when the task is not loaded yet, when the task is at the
// version the caller holds, or when this panel itself produced that version.
const isVersionCurrent = (
  task: { readonly version: number } | null,
  version: number,
  trustedVersion: number | null
): boolean =>
  task === null || task.version === version || trustedVersion === version;

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
}: {
  readonly currentUserId: string | null;
  readonly bugId?: string;
  readonly editable: boolean;
  readonly employees: readonly EmployeeOption[];
  // The server's read for a deep-linked task, used for the first load only.
  readonly initialBundlePromise?: Promise<TaskBundle> | null;
  readonly isAdmin: boolean;
  // When open is passed, the caller owns the open state (for example a drawer
  // driven by the URL). Otherwise the trigger opens the panel.
  readonly onOpenChange?: (open: boolean) => void;
  readonly onVersionChange: (version: number) => void;
  readonly open?: boolean;
  readonly projectId: string;
  readonly taskId: string;
  readonly taskType?: "task" | "bug";
  readonly taskTitle?: string;
  readonly trigger?: ReactNode;
  readonly version: number;
}) => {
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
    error,
    errorRevision,
    files,
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
                  <>
                    <TaskWorkSections
                      editable={editable}
                      employees={employees}
                      onDirtyChange={setDetailsDirty}
                      onReload={() => refresh()}
                      onSaved={handleSaved}
                      onVersionChange={recordVersionChange}
                      part="details"
                      projectId={projectId}
                      subtaskActions={subtaskActions}
                      subtasks={subtasks}
                      task={task}
                      taskId={taskId}
                      version={version}
                      versionIsCurrent={isVersionCurrent(
                        task,
                        version,
                        trustedVersion
                      )}
                    />
                    <TaskCustomFields
                      customFields={customFields}
                      onChanged={refresh}
                      taskId={taskId}
                    />
                  </>
                </div>
              )}
              {bugDetailId ? null : (
                <div hidden={tab !== "subtasks"}>
                  <TaskWorkSections
                    editable={editable}
                    employees={employees}
                    onDirtyChange={setDetailsDirty}
                    onReload={() => refresh()}
                    onSaved={handleSaved}
                    onVersionChange={recordVersionChange}
                    part="subtasks"
                    projectId={projectId}
                    subtaskActions={subtaskActions}
                    subtasks={subtasks}
                    task={task}
                    taskId={taskId}
                    version={version}
                    versionIsCurrent={isVersionCurrent(
                      task,
                      version,
                      trustedVersion
                    )}
                  />
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
                <>
                  <section className="stack">
                    <h3>Attachments</h3>
                    <ProjectFiles
                      canUpload={editable}
                      controlledFiles={files}
                      currentUserId={currentUserId}
                      initialFiles={files}
                      isAdmin={isAdmin}
                      projectId={projectId}
                      setControlledFiles={setFiles}
                      taskId={taskId}
                    />
                  </section>
                  <TaskLinkedPulls pulls={pulls} />
                </>
              </div>
              {bugDetailId ? null : (
                <div hidden={tab !== "client"}>
                  <>
                    <TaskWorkSections
                      editable={editable}
                      employees={employees}
                      onDirtyChange={setDetailsDirty}
                      onReload={() => refresh()}
                      onSaved={handleSaved}
                      onVersionChange={recordVersionChange}
                      part="client"
                      projectId={projectId}
                      subtaskActions={subtaskActions}
                      subtasks={subtasks}
                      task={task}
                      taskId={taskId}
                      version={version}
                      versionIsCurrent={isVersionCurrent(
                        task,
                        version,
                        trustedVersion
                      )}
                    />
                    <TaskApprovals
                      approvals={approvals}
                      files={files}
                      onChanged={refresh}
                      taskId={taskId}
                    />
                  </>
                </div>
              )}
              {bugDetailId ? (
                <>
                  <TaskLinkedPulls pulls={pulls} />
                  <TaskCustomFields
                    customFields={customFields}
                    onChanged={refresh}
                    taskId={taskId}
                  />
                  <TaskApprovals
                    approvals={approvals}
                    files={files}
                    onChanged={refresh}
                    taskId={taskId}
                  />
                </>
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

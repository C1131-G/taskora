/* eslint-disable shadcn/no-unknown-classes */
/* eslint-disable shadcn/no-restyle */

import type { ComponentProps } from "react";

import { TaskApprovals } from "@/features/approvals/components/task-approvals";
import { TaskCustomFields } from "@/features/custom-fields/components/task-custom-fields";
import { ProjectFiles } from "@/features/files/components/project-files";
import { TaskLinkedPulls } from "@/features/github/components/task-linked-pulls";

type FilesProps = ComponentProps<typeof ProjectFiles>;

// Attachments, with the pull requests linked to the task.
export const TaskFilesSection = ({
  currentUserId,
  editable,
  files,
  isAdmin,
  projectId,
  pulls,
  setFiles,
  taskId,
}: {
  readonly currentUserId: string | null;
  readonly editable: boolean;
  readonly files: NonNullable<FilesProps["controlledFiles"]>;
  readonly isAdmin: boolean;
  readonly projectId: string;
  readonly pulls: ComponentProps<typeof TaskLinkedPulls>["pulls"];
  readonly setFiles: NonNullable<FilesProps["setControlledFiles"]>;
  readonly taskId: string;
}) => (
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
);

// A bug's drawer shows its pull requests, custom fields and approvals together
// after the discussion.
export const TaskBugExtras = ({
  approvals,
  customFields,
  files,
  onChanged,
  pulls,
  taskId,
}: {
  readonly approvals: ComponentProps<typeof TaskApprovals>["approvals"];
  readonly customFields: ComponentProps<
    typeof TaskCustomFields
  >["customFields"];
  readonly files: ComponentProps<typeof TaskApprovals>["files"];
  readonly onChanged: ComponentProps<typeof TaskCustomFields>["onChanged"];
  readonly pulls: ComponentProps<typeof TaskLinkedPulls>["pulls"];
  readonly taskId: string;
}) => (
  <>
    <TaskLinkedPulls pulls={pulls} />
    <TaskCustomFields
      customFields={customFields}
      onChanged={onChanged}
      taskId={taskId}
    />
    <TaskApprovals
      approvals={approvals}
      files={files}
      onChanged={onChanged}
      taskId={taskId}
    />
  </>
);

/* eslint-disable shadcn/no-unknown-classes */
/* eslint-disable shadcn/no-restyle */

"use client";

import { useTransition } from "react";
import { toast } from "sonner";

import { WorkspaceButton } from "@/components/workspace/workspace-button";
import { restoreProjectAction } from "@/features/projects/projects-actions";
import { restoreTaskAction } from "@/features/tasks/tasks-actions";

const ArchiveRestoreButton = ({
  kind,
  id,
  version,
}: {
  readonly kind: "project" | "task";
  readonly id: string;
  readonly version: number;
}) => {
  const [pending, startTransition] = useTransition();

  const restore = () =>
    startTransition(async () => {
      try {
        const input = {
          expectedVersion: version,
          idempotencyKey: crypto.randomUUID(),
        };
        const result =
          kind === "project"
            ? await restoreProjectAction({ ...input, projectId: id })
            : await restoreTaskAction({ ...input, taskId: id });
        if (!result.ok) {
          toast.error(result.error.message);
        }
      } catch {
        toast.error("The item could not be restored. Try again.");
      }
    });

  return (
    <span className="col">
      <WorkspaceButton
        disabled={pending}
        onClick={restore}
        size="sm"
        type="button"
        variant="secondary"
        workspace
      >
        {pending ? "Restoring…" : "Restore"}
      </WorkspaceButton>
    </span>
  );
};

export { ArchiveRestoreButton };

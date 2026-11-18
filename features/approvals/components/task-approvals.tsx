/* eslint-disable shadcn/no-unknown-classes */

"use client";

import { TaskApprovalForm } from "@/features/approvals/components/task-approval-form";
import { TaskApprovalHistory } from "@/features/approvals/components/task-approval-history";
import type { TaskApprovals as TaskApprovalsView } from "@/src/server/approvals/approval-contracts";

interface ReadyFile {
  readonly id: string;
  readonly originalName: string;
  readonly copyState: string;
}

// The drawer's client approval section: every version requested so far, and a
// form to send a new one to any company not already waiting or approved.
export const TaskApprovals = ({
  approvals,
  files,
  onChanged,
  taskId,
}: {
  readonly approvals: TaskApprovalsView | null;
  readonly files: readonly ReadyFile[];
  readonly onChanged: () => Promise<void>;
  readonly taskId: string;
}) => {
  if (!approvals) {
    return null;
  }
  // The server lists only companies a new version may go to now.
  const canAsk = approvals.canRequest && approvals.companies.length > 0;
  if (approvals.requests.length === 0 && !canAsk) {
    return null;
  }
  return (
    <section aria-label="Client approval" className="stack">
      <h3>Client approval</h3>
      <TaskApprovalHistory
        onChanged={onChanged}
        requests={approvals.requests}
      />
      {canAsk ? (
        <TaskApprovalForm
          companies={approvals.companies}
          files={files.filter(({ copyState }) => copyState === "ready")}
          onRequested={onChanged}
          taskId={taskId}
        />
      ) : null}
    </section>
  );
};

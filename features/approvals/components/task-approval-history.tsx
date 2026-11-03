/* eslint-disable shadcn/no-unknown-classes */
/* eslint-disable shadcn/no-restyle */

"use client";

import { useTransition } from "react";
import { toast } from "sonner";

import { LocalTime } from "@/components/workspace/local-time";
import { WorkspaceButton } from "@/components/workspace/workspace-button";
import { cancelApprovalAction } from "@/features/approvals/approval-actions";
import { APPROVAL_STATUS_BADGES } from "@/features/approvals/approval-status";
import type { TaskApprovals } from "@/src/server/approvals/approval-contracts";

type Request = TaskApprovals["requests"][number];

// One row of the approval history. Decided versions are read only; a waiting
// one can be withdrawn by the person who asked or an administrator.
const ApprovalRow = ({
  canCancel,
  onChanged,
  request,
}: {
  readonly canCancel: boolean;
  readonly onChanged: () => Promise<void>;
  readonly request: Request;
}) => {
  const [pending, startTransition] = useTransition();
  const badge = APPROVAL_STATUS_BADGES[request.status];

  const cancel = () => {
    startTransition(async () => {
      try {
        const result = await cancelApprovalAction({
          idempotencyKey: crypto.randomUUID(),
          requestId: request.id,
        });
        if (!result.ok) {
          toast.error(result.error.message);
          return;
        }
        await onChanged();
      } catch {
        toast.error(
          "The approval request could not be withdrawn or refreshed. Try again."
        );
      }
    });
  };

  return (
    <li className="approval-card" data-approval-version={request.version}>
      <div className="approval-head">
        <strong>Version {request.version}</strong>
        <span className={`badge ${badge.tone}`}>{badge.label}</span>
        <span className="approval-company">{request.companyName}</span>
      </div>
      <p className="approval-meta">
        Requested by {request.requestedByName} on{" "}
        <LocalTime value={request.requestedAt} />
      </p>
      <p className="approval-message">{request.message}</p>
      <ul className="approval-files">
        {request.files.map((file) => (
          <li key={file.fileId}>{file.fileName}</li>
        ))}
      </ul>
      {request.decidedAt ? (
        <p className="approval-decision">
          {request.status === "approved" ? "Approved" : "Changes requested"} by{" "}
          {request.decidedByName ?? "a client"} on{" "}
          <LocalTime value={request.decidedAt} />
          {request.decisionComment ? `: ${request.decisionComment}` : ""}
        </p>
      ) : null}
      {request.status === "pending" && canCancel ? (
        <div className="row">
          <WorkspaceButton
            aria-busy={pending || undefined}
            className="btn"
            disabled={pending}
            onClick={cancel}
            type="button"
          >
            {pending ? "Withdrawing…" : "Withdraw request"}
          </WorkspaceButton>
        </div>
      ) : null}
    </li>
  );
};

export const TaskApprovalHistory = ({
  canCancel,
  onChanged,
  requests,
}: {
  readonly canCancel: boolean;
  readonly onChanged: () => Promise<void>;
  readonly requests: TaskApprovals["requests"];
}) => (
  <ul aria-label="Approval history" className="approval-list">
    {requests.map((request) => (
      <ApprovalRow
        canCancel={canCancel}
        key={request.id}
        onChanged={onChanged}
        request={request}
      />
    ))}
  </ul>
);

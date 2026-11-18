/* eslint-disable shadcn/no-unknown-classes */
/* eslint-disable shadcn/no-restyle */

"use client";

import { LocalTime } from "@/components/workspace/local-time";
import { APPROVAL_STATUS_BADGES } from "@/features/approvals/approval-status";
import { ApprovalWithdrawButton } from "@/features/approvals/components/approval-withdraw-button";
import type { TaskApprovals } from "@/src/server/approvals/approval-contracts";

type Request = TaskApprovals["requests"][number];

// One row of the approval history. Decided versions are read only; a waiting
// one offers Withdraw when the server says this reader may withdraw it.
const ApprovalRow = ({
  onChanged,
  request,
}: {
  readonly onChanged: () => Promise<void>;
  readonly request: Request;
}) => {
  const badge = APPROVAL_STATUS_BADGES[request.status];

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
      {request.canCancel ? (
        <ApprovalWithdrawButton onChanged={onChanged} requestId={request.id} />
      ) : null}
    </li>
  );
};

export const TaskApprovalHistory = ({
  onChanged,
  requests,
}: {
  readonly onChanged: () => Promise<void>;
  readonly requests: TaskApprovals["requests"];
}) => (
  <ul aria-label="Approval history" className="approval-list">
    {requests.map((request) => (
      <ApprovalRow key={request.id} onChanged={onChanged} request={request} />
    ))}
  </ul>
);

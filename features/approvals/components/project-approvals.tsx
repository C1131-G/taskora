/* eslint-disable shadcn/no-unknown-classes */

import { LocalTime } from "@/components/workspace/local-time";
import {
  SKELETON_KEYS,
  SkeletonBone,
} from "@/components/workspace/skeleton-shapes";
import {
  SkeletonKeep,
  SkelterSurface,
} from "@/components/workspace/skelter-surface";
import { listProjectApprovals } from "@/features/approvals/approval-queries";
import { APPROVAL_STATUS_BADGES } from "@/features/approvals/approval-status";
import { ApprovalWithdrawButton } from "@/features/approvals/components/approval-withdraw-button";
import { ProjectApprovalForm } from "@/features/approvals/components/project-approval-form";
import { readOrThrow } from "@/lib/read-result";
import type { ProjectApprovals as ProjectApprovalsData } from "@/src/server/approvals/approval-contracts";

type Request = ProjectApprovalsData["requests"][number];

const decisionOf = (request: Request) => {
  if (request.status === "cancelled") {
    return request.cancelledAt ? (
      <>
        Withdrawn <LocalTime value={request.cancelledAt} />
      </>
    ) : (
      "Withdrawn"
    );
  }
  if (!request.decidedAt) {
    return "Waiting";
  }
  const verdict =
    request.status === "approved" ? "Approved" : "Changes requested";
  return (
    <>
      {verdict} by {request.decidedByName ?? "a client"} on{" "}
      <LocalTime value={request.decidedAt} />
      {request.decisionComment ? `: ${request.decisionComment}` : ""}
    </>
  );
};

const RequestRow = ({ request }: { readonly request: Request }) => {
  const badge = APPROVAL_STATUS_BADGES[request.status];
  return (
    <li
      className="approval-request"
      data-approval-status={request.status}
      data-approval-version={request.version}
    >
      <div className="approval-request-main">
        <div className="approval-request-title">
          <strong>{request.subjectTitle}</strong>
          <span className="approval-request-kind">
            {request.subjectKind === "task" ? "Task" : "Milestone"}
          </span>
        </div>
        <p className="approval-request-meta">
          {request.companyName} · Version {request.version} · Requested by{" "}
          {request.requestedByName} on <LocalTime value={request.requestedAt} />
        </p>
        <p className="approval-request-decision">{decisionOf(request)}</p>
        {request.canCancel ? (
          <ApprovalWithdrawButton requestId={request.id} />
        ) : null}
      </div>
      <span className={`badge ${badge.tone}`}>{badge.label}</span>
    </li>
  );
};

// The Approvals view: every request for the project's tasks and milestones,
// with Withdraw where the server allows it, and for administrators the
// milestone request form.
export const ProjectApprovals = async ({
  projectId,
}: {
  readonly projectId: string;
}) => {
  const approvals = readOrThrow(
    await listProjectApprovals({ projectId }),
    "Approvals"
  );
  const count = (status: Request["status"]) =>
    approvals.requests.filter((request) => request.status === status).length;
  const waiting = count("pending");
  const approved = count("approved");
  const changes = count("changes_requested");
  return (
    <div className="stack" data-project-approvals="true">
      <section aria-labelledby="project-approvals-heading" className="panel">
        <div className="panel-h">
          <h2 id="project-approvals-heading">Client approvals</h2>
          <span className="ct">{approvals.requests.length}</span>
        </div>
        <div className="approval-body">
          {approvals.requests.length > 0 ? (
            <p className="approval-summary">
              <strong>{waiting}</strong> waiting for the client ·{" "}
              <strong>{approved}</strong> approved · <strong>{changes}</strong>{" "}
              need changes
            </p>
          ) : null}
          {approvals.requests.length === 0 ? (
            <p className="approval-empty">
              No approvals have been requested yet.
            </p>
          ) : (
            <ul
              aria-label="Approval requests for this project"
              className="approval-requests"
            >
              {approvals.requests.map((request) => (
                <RequestRow key={request.id} request={request} />
              ))}
            </ul>
          )}
        </div>
      </section>
      {approvals.canRequest ? (
        <section aria-labelledby="milestone-approval-heading" className="panel">
          <div className="panel-h">
            <h2 id="milestone-approval-heading">Request milestone approval</h2>
          </div>
          <div className="panel-b">
            <ProjectApprovalForm
              choices={{
                companies: approvals.companies,
                files: approvals.files,
                milestones: approvals.milestones,
              }}
            />
          </div>
        </section>
      ) : null}
    </div>
  );
};

// Mirrors ProjectApprovals: the panel and its heading are static; the count
// and request rows are data. The admin-only request form is not reserved.
export const ProjectApprovalsSkeleton = () => (
  <SkelterSurface label="Loading approvals…">
    <div className="stack">
      <section className="panel">
        <div className="panel-h">
          <h2>
            <SkeletonKeep>Client approvals</SkeletonKeep>
          </h2>
          <span className="ct">
            <SkeletonBone shape="short" />
          </span>
        </div>
        <div className="approval-body">
          <ul className="approval-requests">
            {SKELETON_KEYS.slice(0, 3).map((key) => (
              <li className="approval-request" key={key}>
                <div className="approval-request-main">
                  <div className="approval-request-title">
                    <SkeletonBone />
                  </div>
                  <p className="approval-request-meta">
                    <SkeletonBone />
                  </p>
                  <p className="approval-request-decision">
                    <SkeletonBone shape="short" />
                  </p>
                </div>
                <SkeletonBone shape="short" />
              </li>
            ))}
          </ul>
        </div>
      </section>
    </div>
  </SkelterSurface>
);

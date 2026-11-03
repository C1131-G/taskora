/* eslint-disable shadcn/no-unknown-classes */

import { LocalTime } from "@/components/workspace/local-time";
import { listProjectApprovals } from "@/features/approvals/approval-queries";
import { APPROVAL_STATUS_BADGES } from "@/features/approvals/approval-status";
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
      </div>
      <span className={`badge ${badge.tone}`}>{badge.label}</span>
    </li>
  );
};

// The Approvals view: a read-only list of every request for the project's
// tasks and milestones, and for administrators the milestone request form.
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

export const ProjectApprovalsSkeleton = () => (
  <div aria-hidden="true" className="stack">
    <section className="panel">
      <div className="panel-h">
        <h2>Client approvals</h2>
      </div>
      <div className="panel-b" />
    </section>
  </div>
);

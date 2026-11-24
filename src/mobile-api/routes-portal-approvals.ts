import { Schema } from "effect";

import type { RouteDefinition } from "./route-definition";
import { Uuid, Version } from "./routes-bug-fields";
import { NextCursorSchema, PageQuerySchema } from "./routes-paging";

// ---- Portal (client) approvals ----

const PortalApprovalDomainStatus = Schema.Literals([
  "pending",
  "approved",
  "changes_requested",
  "cancelled",
]);

// The app's list contract: one line per request, with "rejected" standing for
// the domain's "changes_requested". The detail keeps the domain statuses.
const PortalApprovalItem = Schema.Struct({
  id: Uuid,
  projectName: Schema.String,
  requestedBy: Schema.String,
  status: Schema.Literals(["pending", "approved", "rejected"]),
  title: Schema.String,
});

export const PortalApprovalList = Schema.Struct({
  items: Schema.Array(PortalApprovalItem),
  nextCursor: NextCursorSchema,
});

const PortalApprovalParams = Schema.Struct({ requestId: Uuid });

const PortalApprovalFile = Schema.Struct({
  contentType: Schema.String,
  fileId: Uuid,
  fileName: Schema.String,
  previewable: Schema.Boolean,
  sizeBytes: Schema.Number,
});

const PortalApprovalHistory = Schema.Struct({
  decidedAt: Schema.NullOr(Schema.String),
  decidedByName: Schema.NullOr(Schema.String),
  decisionComment: Schema.NullOr(Schema.String),
  id: Uuid,
  requestedAt: Schema.String,
  status: PortalApprovalDomainStatus,
  version: Version,
});

const PortalApprovalDetail = Schema.Struct({
  canDecide: Schema.Boolean,
  decidedAt: Schema.NullOr(Schema.String),
  decidedByName: Schema.NullOr(Schema.String),
  decisionComment: Schema.NullOr(Schema.String),
  fileCount: Schema.Number,
  files: Schema.Array(PortalApprovalFile),
  history: Schema.Array(PortalApprovalHistory),
  id: Uuid,
  message: Schema.String,
  projectName: Schema.String,
  requestedAt: Schema.String,
  requestedByName: Schema.String,
  status: PortalApprovalDomainStatus,
  subjectKind: Schema.Literals(["task", "milestone"]),
  subjectTitle: Schema.String,
  version: Version,
});

const PortalApprovalDecisionBody = Schema.Struct({
  comment: Schema.String.check(Schema.isMaxLength(2000)),
  decision: Schema.Literals(["approve", "request_changes"]),
  requestId: Uuid,
});

const PortalApprovalDecision = Schema.Struct({
  requestId: Uuid,
  status: PortalApprovalDomainStatus,
});

export const portalApprovalRoutes = {
  decide: {
    body: PortalApprovalDecisionBody,
    data: PortalApprovalDecision,
    method: "post",
    operationId: "decidePortalApproval",
    path: "/api/v1/portal/approvals/decide",
    summary: "Approve a deliverable or ask the team for changes.",
  },
  detail: {
    data: PortalApprovalDetail,
    method: "get",
    operationId: "getPortalApproval",
    params: PortalApprovalParams,
    path: "/api/v1/portal/approvals/{requestId}",
    summary: "One approval request, with its files and earlier versions.",
  },
  list: {
    data: PortalApprovalList,
    method: "get",
    operationId: "listPortalApprovals",
    path: "/api/v1/portal/approvals",
    query: PageQuerySchema,
    summary:
      "The client's pending and decided approvals, pending first, one page at a time.",
  },
} as const satisfies Record<string, RouteDefinition>;

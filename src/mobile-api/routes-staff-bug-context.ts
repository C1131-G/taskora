import { Schema } from "effect";

import type { RouteDefinition } from "./route-definition";
import { BugIdParams, Uuid, Version } from "./routes-bug-fields";
import { ClientImpact, Satisfaction } from "./routes-portal-bugs";

// Workspace (staff) bug history and context.

export const WorkflowStatus = Schema.Literals([
  "reported",
  "triaged",
  "in_progress",
  "in_verification",
  "awaiting_admin_approval",
  "approved_for_release",
  "released",
  "closed",
  "duplicate",
  "rejected",
  "needs_info",
  "awaiting_client",
  "withdrawn",
]);
export const Severity = Schema.Literals([
  "blocker",
  "critical",
  "major",
  "minor",
  "trivial",
]);
export const Priority = Schema.Literals([
  "urgent",
  "high",
  "medium",
  "low",
  "none",
]);

export const WorkflowReceipt = Schema.Struct({
  bugId: Uuid,
  status: WorkflowStatus,
  version: Version,
});

const DiscoverySource = Schema.Literals([
  "internal_qa",
  "customer_report",
  "support",
  "automated_test",
  "monitoring",
  "employee_report",
]);
export const Environment = Schema.Literals([
  "production",
  "staging",
  "development",
  "test",
  "other",
]);

// The staff view of a bug, mirroring `BugHistorySchema` in
// `src/server/work/bug-history-contracts.ts` field for field. The route file
// never imports that schema, so a test decodes a real response against this
// copy and fails when the two drift apart.
const StaffBugReport = Schema.Struct({
  actualBehavior: Schema.String,
  appVersion: Schema.NullOr(Schema.String),
  browser: Schema.NullOr(Schema.String),
  clientCompanyId: Schema.NullOr(Uuid),
  clientImpact: Schema.NullOr(ClientImpact),
  component: Schema.String,
  description: Schema.NullOr(Schema.String),
  device: Schema.NullOr(Schema.String),
  discoveredAt: Schema.String,
  discoverySource: DiscoverySource,
  environment: Environment,
  expectedBehavior: Schema.String,
  id: Uuid,
  needsReassignment: Schema.Boolean,
  os: Schema.NullOr(Schema.String),
  pickedById: Schema.NullOr(Schema.String),
  projectId: Uuid,
  projectKey: Schema.String,
  projectTaskNumber: Schema.Number.check(
    Schema.isInt(),
    Schema.isGreaterThan(0)
  ),
  reporterId: Uuid,
  reproductionSteps: Schema.Array(Schema.String),
  route: Schema.String,
  severity: Severity,
  status: WorkflowStatus,
  taskId: Uuid,
  title: Schema.String,
  version: Version,
});

const SlaClockView = Schema.Struct({
  dueAt: Schema.String,
  minutesLeft: Schema.NullOr(Schema.Number),
  state: Schema.Literals([
    "ok",
    "warning",
    "breached",
    "met",
    "missed",
    "paused",
  ]),
});

export const SlaView = Schema.Struct({
  firstResponse: SlaClockView,
  resolution: SlaClockView,
});

const BrowserContext = Schema.Struct({
  language: Schema.String,
  path: Schema.String,
  pixelRatio: Schema.Number,
  timeZone: Schema.String,
  userAgent: Schema.String,
  viewportHeight: Schema.Number,
  viewportWidth: Schema.Number,
});

const StaffBugAttempt = Schema.Struct({
  affectedVersion: Schema.NullOr(Schema.String),
  authorId: Schema.String,
  commitUrl: Schema.NullOr(Schema.String),
  createdAt: Schema.String,
  fixSummary: Schema.String,
  fixedVersion: Schema.NullOr(Schema.String),
  id: Uuid,
  pullRequestUrl: Schema.NullOr(Schema.String),
  rootCause: Schema.String,
  testedEnvironment: Schema.NullOr(Environment),
  testedVersion: Schema.NullOr(Schema.String),
  verificationNotes: Schema.NullOr(Schema.String),
  verificationOutcome: Schema.NullOr(Schema.Literals(["passed", "failed"])),
  verificationSteps: Schema.Array(Schema.String),
  verifiedAt: Schema.NullOr(Schema.String),
  verifiedById: Schema.NullOr(Schema.String),
});

const StaffBugApproval = Schema.Struct({
  comment: Schema.NullOr(Schema.String),
  decidedAt: Schema.NullOr(Schema.String),
  decidedById: Schema.NullOr(Schema.String),
  id: Uuid,
  rejectionReason: Schema.NullOr(Schema.String),
  snapshot: Schema.Json,
  status: Schema.Literals(["pending", "approved", "rejected"]),
  submittedAt: Schema.String,
  submittedById: Schema.String,
});

const StaffBugEvidence = Schema.Struct({
  caption: Schema.String,
  createdAt: Schema.String,
  externalUrl: Schema.NullOr(Schema.String),
  file: Schema.NullOr(
    Schema.Struct({
      contentType: Schema.NullOr(Schema.String),
      id: Uuid,
      name: Schema.String,
      sizeBytes: Schema.Number,
    })
  ),
  id: Uuid,
  kind: Schema.Literals(["before", "after", "other"]),
  uploadedBy: Schema.Struct({ id: Schema.String, name: Schema.String }),
});

const StaffBugHistory = Schema.Struct({
  approvals: Schema.Array(StaffBugApproval),
  archived: Schema.Boolean,
  assignees: Schema.Array(
    Schema.Struct({ id: Schema.String, name: Schema.String })
  ),
  attempts: Schema.Array(StaffBugAttempt),
  bug: StaffBugReport,
  clientContext: Schema.NullOr(BrowserContext),
  clientReport: Schema.NullOr(
    Schema.Struct({
      awaitingClientSince: Schema.NullOr(Schema.String),
      canAskClient: Schema.Boolean,
      canCloseNotABug: Schema.Boolean,
      canPick: Schema.Boolean,
      companyId: Uuid,
      companyName: Schema.String,
      needsInfoSince: Schema.NullOr(Schema.String),
      pickedAt: Schema.NullOr(Schema.String),
      pickedByName: Schema.NullOr(Schema.String),
      reopenCount: Schema.Number,
      resolution: Schema.NullOr(Schema.String),
      satisfaction: Schema.NullOr(Satisfaction),
      satisfactionComment: Schema.NullOr(Schema.String),
      sla: Schema.NullOr(SlaView),
    })
  ),
  evidence: Schema.Array(StaffBugEvidence),
  priority: Priority,
  relations: Schema.Array(
    Schema.Struct({
      bug: StaffBugReport,
      type: Schema.Literals(["duplicate", "recurrence"]),
    })
  ),
  releases: Schema.Array(
    Schema.Struct({
      checkedAt: Schema.NullOr(Schema.String),
      environment: Environment,
      id: Uuid,
      postReleaseCheckNotes: Schema.NullOr(Schema.String),
      postReleaseCheckPassed: Schema.Boolean,
      releasedAt: Schema.String,
      releasedById: Schema.String,
      version: Schema.String,
    })
  ),
});

export const staffBugContextRoute = {
  data: StaffBugHistory,
  method: "get",
  operationId: "getWorkspaceBug",
  params: BugIdParams,
  path: "/api/v1/workspace/bugs/{bugId}",
  summary: "A bug's full staff history, with its client context.",
} as const satisfies RouteDefinition;

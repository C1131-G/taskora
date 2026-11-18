import { Schema } from "effect";

import type { RouteDefinition } from "./route-definition";
import {
  BugIdParams,
  ShortText,
  Text,
  Uuid,
  Version,
} from "./routes-bug-fields";
import {
  Environment,
  Priority,
  Severity,
  WorkflowReceipt,
} from "./routes-staff-bug-context";

// Workspace (staff) bug actions.

const StaffPickBody = Schema.Struct({
  expectedVersion: Version,
  priority: Priority,
  severity: Severity,
});

const StaffTriageBody = Schema.Struct({
  assigneeIds: Schema.Array(Uuid).check(Schema.isMaxLength(100)),
  expectedVersion: Version,
  priority: Priority,
  severity: Severity,
});

const StaffReassignBody = Schema.Struct({
  employeeId: Uuid,
  expectedVersion: Version,
});

const StaffRequestInfoBody = Schema.Struct({
  expectedVersion: Version,
  question: Text,
});

const StaffFixAttemptBody = Schema.Struct({
  affectedVersion: ShortText,
  commitUrl: ShortText,
  expectedVersion: Version,
  fixSummary: Text,
  fixedVersion: ShortText,
  pullRequestUrl: ShortText,
  rootCause: Text,
  verificationSteps: Schema.Array(Text).check(
    Schema.isMinLength(1),
    Schema.isMaxLength(30)
  ),
});

const StaffVerificationBody = Schema.Struct({
  attemptId: Uuid,
  expectedVersion: Version,
  notes: Text,
  outcome: Schema.Literals(["passed", "failed"]),
  testedEnvironment: Environment,
  testedVersion: Text,
});

const StaffApprovalBody = Schema.Struct({
  expectedVersion: Version,
  fixAttemptId: Uuid,
});

const StaffApprovalDecisionBody = Schema.Struct({
  approvalId: Uuid,
  comment: Schema.NullOr(Schema.String.check(Schema.isMaxLength(10_000))),
  decision: Schema.Literals(["approved", "rejected"]),
  expectedVersion: Version,
  rejectionReason: Schema.NullOr(Schema.String.check(Schema.isMaxLength(2000))),
});

export const staffBugActionRoutes = {
  approval: {
    body: StaffApprovalBody,
    data: WorkflowReceipt,
    method: "post",
    operationId: "submitBugApproval",
    params: BugIdParams,
    path: "/api/v1/workspace/bugs/{bugId}/approval",
    summary: "Send a verified fix to an admin for approval.",
  },
  approvalDecision: {
    body: StaffApprovalDecisionBody,
    data: WorkflowReceipt,
    method: "post",
    operationId: "decideBugApproval",
    params: BugIdParams,
    path: "/api/v1/workspace/bugs/{bugId}/approval/decision",
    summary: "Approve a fix for release or send it back with a reason.",
  },
  fixAttempt: {
    body: StaffFixAttemptBody,
    data: WorkflowReceipt,
    method: "post",
    operationId: "recordBugFixAttempt",
    params: BugIdParams,
    path: "/api/v1/workspace/bugs/{bugId}/fix-attempts",
    summary: "Record the root cause, the fix and how to verify it.",
  },
  pick: {
    body: StaffPickBody,
    data: WorkflowReceipt,
    method: "post",
    operationId: "pickWorkspaceBug",
    params: BugIdParams,
    path: "/api/v1/workspace/bugs/{bugId}/pick",
    summary:
      "Pick up a client report. Only a designated handler of the client's company may.",
  },
  reassign: {
    body: StaffReassignBody,
    data: WorkflowReceipt,
    method: "post",
    operationId: "reassignWorkspaceBug",
    params: BugIdParams,
    path: "/api/v1/workspace/bugs/{bugId}/reassign",
    summary: "Hand a picked client bug to exactly one employee.",
  },
  requestInfo: {
    body: StaffRequestInfoBody,
    data: WorkflowReceipt,
    method: "post",
    operationId: "requestBugInfo",
    params: BugIdParams,
    path: "/api/v1/workspace/bugs/{bugId}/request-info",
    summary: "Ask the client a question and wait for their answer.",
  },
  triage: {
    body: StaffTriageBody,
    data: WorkflowReceipt,
    method: "post",
    operationId: "triageWorkspaceBug",
    params: BugIdParams,
    path: "/api/v1/workspace/bugs/{bugId}/triage",
    summary: "Set the assignees, priority and severity of a client report.",
  },
  verification: {
    body: StaffVerificationBody,
    data: WorkflowReceipt,
    method: "post",
    operationId: "verifyBugFix",
    params: BugIdParams,
    path: "/api/v1/workspace/bugs/{bugId}/verifications",
    summary: "Say whether a fix attempt passed its verification.",
  },
} as const satisfies Record<string, RouteDefinition>;

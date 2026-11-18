import { Schema } from "effect";

import type { RouteDefinition } from "./route-definition";
import { Uuid } from "./routes-bug-fields";
import { NextCursorSchema, PageQuerySchema } from "./routes-paging";

const BugApprovalStatus = Schema.Literals(["pending", "approved", "rejected"]);

export const StaffBugApprovalInbox = Schema.Struct({
  items: Schema.Array(
    Schema.Struct({
      bugTitle: Schema.String,
      id: Uuid,
      projectName: Schema.String,
      reportedBy: Schema.String,
      status: BugApprovalStatus,
    })
  ),
  nextCursor: NextCursorSchema,
});

export const staffBugApprovalInboxRoute = {
  data: StaffBugApprovalInbox,
  method: "get",
  operationId: "listBugApprovals",
  path: "/api/v1/workspace/bug-approvals",
  query: PageQuerySchema,
  summary:
    "The bug approvals with their status, newest first, one page at a time.",
} as const satisfies RouteDefinition;

const WorkspaceApprovalBody = Schema.Struct({
  companyId: Uuid,
  fileIds: Schema.Array(Uuid).check(Schema.isMaxLength(10)),
  message: Schema.String.check(Schema.isMaxLength(2000)),
  taskId: Uuid,
});

const WorkspaceApprovalReceipt = Schema.Struct({
  id: Uuid,
  version: Schema.Number,
});

export const workspaceApprovalRoute = {
  body: WorkspaceApprovalBody,
  data: WorkspaceApprovalReceipt,
  method: "post",
  operationId: "requestWorkspaceApproval",
  path: "/api/v1/workspace/approvals",
  summary:
    "Ask a client company to approve a shared task with its finished files.",
} as const satisfies RouteDefinition;

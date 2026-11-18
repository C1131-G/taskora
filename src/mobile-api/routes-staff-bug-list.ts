import { Schema } from "effect";

import type { RouteDefinition } from "./route-definition";
import { BugIdParams, Uuid, Version } from "./routes-bug-fields";
import {
  Priority,
  Severity,
  SlaView,
  WorkflowStatus,
} from "./routes-staff-bug-context";

// Workspace (staff) bug list and comments.

const BUG_LIST_MAX_PAGE_SIZE = 100;

// What the caller may do with a bug right now, so the app shows only what the
// services will accept.
export const StaffBugAction = Schema.Literals([
  "comment",
  "reply_to_client",
  "pick",
  "request_info",
]);

export const StaffBugListItem = Schema.Struct({
  clientCompanyName: Schema.NullOr(Schema.String),
  id: Uuid,
  permittedActions: Schema.Array(StaffBugAction),
  priority: Priority,
  reference: Schema.String,
  severity: Severity,
  sla: Schema.NullOr(SlaView),
  status: WorkflowStatus,
  title: Schema.String,
  updatedAt: Schema.String,
  version: Version,
});

export const StaffBugList = Schema.Struct({
  items: Schema.Array(StaffBugListItem),
  nextCursor: Schema.NullOr(Schema.String),
});

export const staffBugListRoute = {
  data: StaffBugList,
  method: "get",
  operationId: "listWorkspaceBugs",
  path: "/api/v1/workspace/bugs",
  query: Schema.Struct({
    cursor: Schema.optional(Schema.String.check(Schema.isMinLength(1))),
    limit: Schema.optional(
      Schema.FiniteFromString.check(
        Schema.isInt(),
        Schema.isBetween({ maximum: BUG_LIST_MAX_PAGE_SIZE, minimum: 1 })
      )
    ),
    status: Schema.optional(WorkflowStatus),
  }),
  summary:
    "The bugs the caller handles or is assigned to (an admin sees all), most recently changed first, one page at a time.",
} as const satisfies RouteDefinition;

export const BUG_LIST_DEFAULT_PAGE_SIZE = 30;

const CommentVisibility = Schema.Literals(["internal", "public"]);

const StaffCommentBody = Schema.Struct({
  body: Schema.String.check(Schema.isMinLength(1), Schema.isMaxLength(10_000)),
  // "internal" stays with the team; "public" is a reply the client sees.
  visibility: CommentVisibility,
});

export const StaffBugComment = Schema.Struct({
  authorId: Schema.String,
  body: Schema.String,
  bugId: Uuid,
  createdAt: Schema.String,
  id: Uuid,
  visibility: CommentVisibility,
});

export const staffBugCommentRoute = {
  body: StaffCommentBody,
  data: StaffBugComment,
  method: "post",
  operationId: "addWorkspaceBugComment",
  params: BugIdParams,
  path: "/api/v1/workspace/bugs/{bugId}/comments",
  summary:
    "Reply in a bug's discussion, as an internal note or as a reply the client sees.",
} as const satisfies RouteDefinition;

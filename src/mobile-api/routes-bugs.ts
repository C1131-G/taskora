import type { RouteDefinition } from "./route-definition";
import { portalApprovalRoutes } from "./routes-portal-approvals";
import { portalBugActionRoutes, portalBugRoutes } from "./routes-portal-bugs";
import {
  staffBugApprovalInboxRoute,
  workspaceApprovalRoute,
} from "./routes-staff-approvals";
import { staffBugActionRoutes } from "./routes-staff-bug-actions";
import { staffBugContextRoute } from "./routes-staff-bug-context";
import {
  staffBugCommentRoute,
  staffBugListRoute,
} from "./routes-staff-bug-list";

export const bugRoutes = [
  portalBugRoutes.page,
  portalBugRoutes.submit,
  portalBugRoutes.detail,
  portalBugActionRoutes.comment,
  portalBugActionRoutes.confirm,
  portalBugActionRoutes.reopen,
  portalApprovalRoutes.list,
  portalApprovalRoutes.detail,
  portalApprovalRoutes.decide,
  staffBugContextRoute,
  staffBugListRoute,
  staffBugApprovalInboxRoute,
  staffBugCommentRoute,
  workspaceApprovalRoute,
  staffBugActionRoutes.approval,
  staffBugActionRoutes.approvalDecision,
  staffBugActionRoutes.fixAttempt,
  staffBugActionRoutes.pick,
  staffBugActionRoutes.reassign,
  staffBugActionRoutes.requestInfo,
  staffBugActionRoutes.triage,
  staffBugActionRoutes.verification,
] as const satisfies readonly RouteDefinition[];

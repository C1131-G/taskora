import { Effect } from "effect";

import type { PortalApprovalList } from "../../../mobile-api/routes-bugs";
import { portalApprovalRoutes } from "../../../mobile-api/routes-bugs";
import type { ApprovalStatus } from "../../approvals/approval-contracts";
import { ApprovalDecisionReceiptSchema } from "../../approvals/approval-contracts";
import { PortalApprovals } from "../../approvals/portal-approvals-service";
import { Idempotency } from "../../core/idempotency";
import { pageOf } from "../paging";
import { asPortalCaller } from "./caller";
import type { PathParams } from "./caller";

type ListStatus = (typeof PortalApprovalList.Type)["items"][number]["status"];

// The app speaks "rejected" where the domain records "changes_requested". A
// cancelled request has no list status: it is gone from the client's side.
const toListStatus = (status: ApprovalStatus): ListStatus | undefined => {
  switch (status) {
    case "pending":
    case "approved": {
      return status;
    }
    case "changes_requested": {
      return "rejected";
    }
    case "cancelled": {
      return undefined;
    }
    default: {
      const _exhaustive: never = status;
      return _exhaustive;
    }
  }
};

export const listPortalApprovals = (request: Request) =>
  asPortalCaller(portalApprovalRoutes.list, request, {}, ({ actor, input }) =>
    Effect.gen(function* list() {
      const approvals = yield* PortalApprovals;
      const requests = yield* approvals.list(actor);
      const page = yield* pageOf(requests, ({ id }) => id, input.query);
      return {
        items: page.items.flatMap((approval) => {
          const status = toListStatus(approval.status);
          return status
            ? [
                {
                  id: approval.id,
                  projectName: approval.projectName,
                  requestedBy: approval.requestedByName,
                  status,
                  title: approval.subjectTitle,
                },
              ]
            : [];
        }),
        nextCursor: page.nextCursor,
      };
    })
  );

export const getPortalApproval = (request: Request, params: PathParams) =>
  asPortalCaller(
    portalApprovalRoutes.detail,
    request,
    params,
    ({ actor, input }) =>
      Effect.gen(function* detail() {
        const approvals = yield* PortalApprovals;
        return yield* approvals.get(actor, input.params.requestId);
      })
  );

export const decidePortalApproval = (request: Request) =>
  asPortalCaller(portalApprovalRoutes.decide, request, {}, ({ actor, input }) =>
    Effect.gen(function* decide() {
      const approvals = yield* PortalApprovals;
      const idempotency = yield* Idempotency;
      return yield* idempotency.run({
        actorId: actor.id,
        execute: () => approvals.decide(actor, input.body),
        input: input.body,
        key: input.idempotencyKey,
        operation: "portal.approval.decide",
        resultSchema: ApprovalDecisionReceiptSchema,
      });
    })
  );

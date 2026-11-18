import { and } from "@prisma/orm-postgres/orm-client";
import { Schema } from "effect";

import { db } from "@/src/prisma/db";

import { AppError } from "../core/action-result";
import { loadSharedProjects } from "../portal/client-visibility";
import type { Transaction } from "../work/work-internal";
import type { ApprovalStatus } from "./approval-contracts";
import { ApprovalStatusSchema } from "./approval-contracts";

export const taskSubjectKey = (taskId: string) => `task:${taskId}`;
export const milestoneSubjectKey = (milestoneId: string) =>
  `milestone:${milestoneId}`;

const isStatus = Schema.is(ApprovalStatusSchema);

// The status column is text; the check constraint keeps it to these values.
// Anything else is a broken row, never a request waiting for the client.
export const toApprovalStatus = (value: string): ApprovalStatus => {
  if (isStatus(value)) {
    return value;
  }
  throw new Error(`Unknown approval status: ${value}`);
};

export const approvalNotFound = () =>
  new AppError({
    code: "NOT_FOUND",
    message: "The approval request was not found.",
  });

interface VisibleFilter {
  readonly ids?: readonly string[];
  readonly subjectKey?: string;
}

// The requests a client company may see. A request reaches a client only
// while its project is still assigned to the company and shared, and, for a
// task, while that task is still marked for the client. A cancelled request
// is gone from the client's side altogether. Anything failing a check reads
// as missing, so another company's request is never confirmed to exist.
export const loadVisibleRequests = async (
  transaction: Transaction,
  companyId: string,
  filter: VisibleFilter = {}
) => {
  const projects = await loadSharedProjects(transaction, companyId);
  const projectNames = new Map(projects.map(({ id, name }) => [id, name]));
  if (projectNames.size === 0) {
    return { projects: projectNames, requests: [] };
  }
  const candidates = await transaction.orm.public.ApprovalRequest.where(
    (request) =>
      and(
        request.companyId.eq(companyId),
        request.projectId.in([...projectNames.keys()]),
        request.status.neq("cancelled")
      )
  ).all();
  const wantedIds = filter.ids ? new Set(filter.ids) : null;
  const wanted = candidates.filter(
    (request) =>
      (!wantedIds || wantedIds.has(request.id)) &&
      (!filter.subjectKey || request.subjectKey === filter.subjectKey)
  );
  const taskIds = [
    ...new Set(wanted.flatMap(({ taskId }) => (taskId ? [taskId] : []))),
  ];
  const shared =
    taskIds.length === 0
      ? []
      : await transaction.orm.public.Task.where((task) =>
          and(
            task.id.in(taskIds),
            task.clientVisible.eq(true),
            task.archivedAt.isNull()
          )
        )
          .select("id")
          .all();
  const sharedTasks = new Set(shared.map(({ id }) => id));
  return {
    projects: projectNames,
    requests: wanted.filter(
      ({ taskId }) => taskId === null || sharedTasks.has(taskId)
    ),
  };
};

// Whether a milestone still exists, holding a share lock on it for the rest
// of the transaction so it cannot be deleted underneath the caller.
export const lockMilestone = async (
  transaction: Transaction,
  milestoneId: string
): Promise<boolean> => {
  await transaction.query(
    transaction.sql.public.project_milestone
      .select("id")
      .where((field, fns) => fns.eq(field.id, milestoneId))
      .forShare()
      .build()
  );
  const milestone = await transaction.orm.public.ProjectMilestone.where({
    id: milestoneId,
  })
    .select("id")
    .first();
  return milestone !== null;
};

export const loadVisibleRequest = async (
  transaction: Transaction,
  companyId: string,
  requestId: string
) => {
  const { requests } = await loadVisibleRequests(transaction, companyId, {
    ids: [requestId],
  });
  return requests[0] ?? null;
};

// Used by the storage layer: a client may open a file only when it belongs to
// a request that company can currently see.
export const clientMayOpenApprovalFile = async (
  companyId: string,
  fileId: string
): Promise<boolean> =>
  await db.transaction(async (transaction) => {
    const attached = await transaction.orm.public.ApprovalRequestFile.where({
      fileId,
    })
      .select("requestId")
      .all();
    if (attached.length === 0) {
      return false;
    }
    const { requests } = await loadVisibleRequests(transaction, companyId, {
      ids: attached.map(({ requestId }) => requestId),
    });
    return requests.length > 0;
  });

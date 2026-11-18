import { randomUUID } from "node:crypto";

import {
  authPool,
  callAs,
  ids,
  nextKey,
  personaId,
  setupHarness,
  teardownHarness,
} from "./action-harness";
import type { ActionResultLike } from "./action-harness";

// Shared by the approval state tests: one project shared with two client
// companies, a task, a milestone and one file for each.
export const staff =
  await import("../../../features/approvals/approval-actions");
export const staffQueries =
  await import("../../../features/approvals/approval-queries");
export const portalQueries =
  await import("../../../features/portal/portal-approval-queries");
const { decideApprovalAction } =
  await import("../../../features/portal/portal-approval-actions");

const suffix = randomUUID().slice(0, 6).toUpperCase();
export const fixture = {
  milestoneFileId: randomUUID(),
  milestoneId: randomUUID(),
  projectId: randomUUID(),
  taskFileId: randomUUID(),
  taskId: randomUUID(),
};

const insertFile = async (id: string, taskId: string | null) => {
  await authPool.query(
    'INSERT INTO file_asset (id, "projectId", "taskId", "uploadedById", "originalName", "storageKey", "contentType", "sizeBytes") VALUES ($1, $2, $3, $4, $5, $6, \'application/pdf\', 10)',
    [
      id,
      fixture.projectId,
      taskId,
      personaId("owner"),
      `${id}.pdf`,
      `state-fixes/${id}`,
    ]
  );
};

export const insertMilestone = async (id: string, name: string) => {
  await authPool.query(
    'INSERT INTO project_milestone (id, "projectId", name, position) VALUES ($1, $2, $3, 0)',
    [id, fixture.projectId, name]
  );
};

export const setupApprovalState = async () => {
  await setupHarness();
  await authPool.query(
    'INSERT INTO project (id, key, name, "clientVisible") VALUES ($1, $2, $3, true)',
    [fixture.projectId, `SF${suffix}`, "Harness state fixes project"]
  );
  // Shared with two companies, so each can be asked separately.
  await authPool.query(
    'INSERT INTO client_company_project (id, "companyId", "projectId") VALUES ($1, $2, $3), ($4, $5, $3)',
    [
      randomUUID(),
      ids.clientCompanyId,
      fixture.projectId,
      randomUUID(),
      ids.otherClientCompanyId,
    ]
  );
  await authPool.query(
    'INSERT INTO task (id, "projectId", "projectTaskNumber", title, "clientVisible", "createdById") VALUES ($1, $2, 1, $3, true, $4)',
    [fixture.taskId, fixture.projectId, "State fixes task", personaId("owner")]
  );
  await authPool.query(
    'INSERT INTO task_assignee ("taskId", "userId", "assignedById") VALUES ($1, $2, $2)',
    [fixture.taskId, personaId("owner")]
  );
  await insertMilestone(fixture.milestoneId, "State fixes launch");
  await insertFile(fixture.taskFileId, fixture.taskId);
  await insertFile(fixture.milestoneFileId, null);
};

export const teardownApprovalState = async () => {
  await authPool.query('DELETE FROM approval_request WHERE "projectId" = $1', [
    fixture.projectId,
  ]);
  await teardownHarness();
};

export const clear = async () => {
  await authPool.query('DELETE FROM approval_request WHERE "projectId" = $1', [
    fixture.projectId,
  ]);
  await authPool.query('UPDATE task SET "clientVisible" = true WHERE id = $1', [
    fixture.taskId,
  ]);
  await authPool.query(
    'UPDATE file_asset SET "deletedAt" = NULL, "deletedById" = NULL WHERE "projectId" = $1',
    [fixture.projectId]
  );
};

export const okData = <Data>(result: ActionResultLike): Data => {
  if (!result.ok) {
    throw new Error(
      `Unexpected failure: ${result.error.code} ${result.error.message}`
    );
  }
  return result.data as Data;
};
export const codeOf = (result: ActionResultLike) =>
  result.ok ? "ok" : result.error.code;

export interface Receipt {
  readonly id: string;
}
export interface StaffRow {
  readonly canCancel: boolean;
  readonly companyId: string;
  readonly id: string;
  readonly status: string;
}
export interface TaskView {
  readonly companies: readonly { readonly id: string }[];
  readonly requests: readonly StaffRow[];
}

export const requestTask = async (
  persona: "admin" | "owner",
  companyId: string = ids.clientCompanyId
) =>
  await callAs(persona, staff.requestApprovalAction, {
    companyId,
    fileIds: [fixture.taskFileId],
    idempotencyKey: nextKey(),
    message: "Please review.",
    taskId: fixture.taskId,
  });

export const requestMilestone = async (
  milestoneId: string = fixture.milestoneId
) =>
  await callAs("admin", staff.requestApprovalAction, {
    companyId: ids.clientCompanyId,
    fileIds: [fixture.milestoneFileId],
    idempotencyKey: nextKey(),
    message: "Please review the launch.",
    milestoneId,
  });

export const taskView = async (persona: "admin" | "owner") =>
  okData<TaskView>(
    await callAs(persona, staffQueries.listTaskApprovals, {
      taskId: fixture.taskId,
    })
  );

export const cancel = async (persona: "admin" | "owner", requestId: string) =>
  await callAs(persona, staff.cancelApprovalAction, {
    idempotencyKey: nextKey(),
    requestId,
  });

export const statusOf = async (requestId: string) => {
  const result = await authPool.query<{ status: string }>(
    "SELECT status FROM approval_request WHERE id = $1",
    [requestId]
  );
  return result.rows[0]?.status;
};

export const decide = async (requestId: string) =>
  await callAs("client", decideApprovalAction, {
    comment: "",
    decision: "approve",
    idempotencyKey: nextKey(),
    requestId,
  });

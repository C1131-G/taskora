import { expect, mock, test } from "bun:test";

import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";

import type { TaskApprovals as TaskApprovalsView } from "@/src/server/approvals/approval-contracts";

// The real actions reach server-only code; rendering needs only their names.
mock.module("@/features/approvals/approval-actions", () => ({
  cancelApprovalAction: () => Promise.resolve({ ok: true }),
  requestApprovalAction: () => Promise.resolve({ ok: true }),
}));

const { TaskApprovals } =
  await import("@/features/approvals/components/task-approvals");

const companyA = "11111111-1111-4111-8111-111111111111";
const companyB = "22222222-2222-4222-8222-222222222222";

const request = (
  id: string,
  overrides: Partial<TaskApprovalsView["requests"][number]>
): TaskApprovalsView["requests"][number] => ({
  canCancel: false,
  cancelledAt: null,
  companyId: companyA,
  companyName: "Company A",
  decidedAt: null,
  decidedByName: null,
  decisionComment: null,
  files: [],
  id,
  message: "Please review.",
  requestedAt: "2026-11-01T10:00:00.000Z",
  requestedByName: "Owner",
  status: "pending",
  version: 1,
  ...overrides,
});

const render = (approvals: TaskApprovalsView): string =>
  renderToStaticMarkup(
    createElement(TaskApprovals, {
      approvals,
      files: [],
      onChanged: async () => {},
      taskId: "33333333-3333-4333-8333-333333333333",
    })
  );

test("offers Withdraw only on the rows the server says this reader may withdraw", () => {
  const markup = render({
    canRequest: true,
    companies: [],
    requests: [
      request("44444444-4444-4444-8444-444444444444", { canCancel: true }),
      request("55555555-5555-4555-8555-555555555555", {
        canCancel: false,
        version: 2,
      }),
    ],
  });
  expect(markup.split("Withdraw request").length - 1).toBe(1);
});

test("keeps the request form for a company the server still lists", () => {
  const markup = render({
    canRequest: true,
    // Company A is waiting; the server lists only B as askable.
    companies: [{ id: companyB, name: "Company B" }],
    requests: [request("44444444-4444-4444-8444-444444444444", {})],
  });
  expect(markup).toContain("Company B");
  expect(markup).toContain("<form");
});

test("shows no form when the server lists no askable company", () => {
  const markup = render({
    canRequest: true,
    companies: [],
    requests: [request("44444444-4444-4444-8444-444444444444", {})],
  });
  expect(markup).not.toContain("<form");
});

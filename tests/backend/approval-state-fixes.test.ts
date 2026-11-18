import { afterAll, beforeAll, expect, it } from "bun:test";

import { toApprovalStatus } from "../../src/server/approvals/approval-access";
import {
  canCancel,
  requestBlockOf,
  requestableCompanies,
} from "../../src/server/approvals/approval-rules";
import { PORTAL_PREVIEW_COOKIE } from "../../src/server/auth/session";
import {
  authPool,
  callAs,
  callAsWithCookie,
  ids,
  personaId,
} from "./support/action-harness";
import {
  cancel,
  clear,
  codeOf,
  fixture,
  okData,
  portalQueries,
  requestMilestone,
  requestTask,
  setupApprovalState,
  statusOf,
  taskView,
  teardownApprovalState,
  staffQueries,
} from "./support/approval-state-fixture";
import type { Receipt, StaffRow } from "./support/approval-state-fixture";

beforeAll(setupApprovalState);
afterAll(teardownApprovalState);

it("keeps the request rules in one place", () => {
  expect(requestBlockOf([])).toBeUndefined();
  expect(requestBlockOf([{ status: "cancelled" }])).toBeUndefined();
  expect(requestBlockOf([{ status: "changes_requested" }])).toBeUndefined();
  expect(requestBlockOf([{ status: "approved" }])).toBe("approved");
  expect(requestBlockOf([{ status: "approved" }, { status: "pending" }])).toBe(
    "pending"
  );
  expect(
    requestableCompanies(
      [{ id: "a" }, { id: "b" }],
      [{ companyId: "a", status: "pending" }]
    )
  ).toEqual([{ id: "b" }]);
  const admin = { id: "admin", role: "admin" };
  const employee = { id: "employee", role: "employee" };
  const pending = { requestedById: "someone", status: "pending" };
  expect(canCancel(admin, pending)).toBe(true);
  expect(canCancel(employee, pending)).toBe(false);
  expect(canCancel(employee, { ...pending, requestedById: "employee" })).toBe(
    true
  );
  expect(canCancel(admin, { ...pending, status: "approved" })).toBe(false);
});

it("refuses an unknown status instead of reading it as pending", () => {
  expect(toApprovalStatus("changes_requested")).toBe("changes_requested");
  expect(() => toApprovalStatus("rejected")).toThrow();
});

it("offers a new version to each company that has nothing waiting or approved", async () => {
  await clear();
  const before = await taskView("owner");
  expect(before.companies.map(({ id }) => id).toSorted()).toEqual(
    [ids.clientCompanyId, ids.otherClientCompanyId].toSorted()
  );
  okData<Receipt>(await requestTask("owner"));
  // The first company is waiting; the second can still be asked.
  const waiting = await taskView("owner");
  expect(waiting.companies.map(({ id }) => id)).toEqual([
    ids.otherClientCompanyId,
  ]);
  expect(codeOf(await requestTask("owner"))).toBe("CONFLICT");
  okData<Receipt>(await requestTask("owner", ids.otherClientCompanyId));
  const full = await taskView("owner");
  expect(full.companies).toEqual([]);
});

it("offers Withdraw exactly to those the server lets withdraw", async () => {
  await clear();
  const asked = okData<Receipt>(await requestTask("admin"));
  // The task's creator and assignee did not ask, so may not withdraw it.
  const ownerView = await taskView("owner");
  expect(ownerView.requests.find(({ id }) => id === asked.id)).toMatchObject({
    canCancel: false,
  });
  expect(codeOf(await cancel("owner", asked.id))).toBe("FORBIDDEN");
  expect(await statusOf(asked.id)).toBe("pending");
  const adminView = await taskView("admin");
  expect(adminView.requests.find(({ id }) => id === asked.id)).toMatchObject({
    canCancel: true,
  });
  okData(await cancel("admin", asked.id));
  // Withdrawing twice is a no-op; a withdrawn request offers nothing.
  okData(await cancel("admin", asked.id));
  expect(await statusOf(asked.id)).toBe("cancelled");
  const after = await taskView("admin");
  expect(after.requests.find(({ id }) => id === asked.id)).toMatchObject({
    canCancel: false,
    status: "cancelled",
  });
});

it("lets the requester withdraw a request whose task was unshared", async () => {
  await clear();
  const asked = okData<Receipt>(await requestTask("owner"));
  await authPool.query(
    'UPDATE task SET "clientVisible" = false WHERE id = $1',
    [fixture.taskId]
  );
  const view = await taskView("owner");
  expect(view.companies).toEqual([]);
  expect(view.requests.find(({ id }) => id === asked.id)).toMatchObject({
    canCancel: true,
  });
  okData(await cancel("owner", asked.id));
  expect(await statusOf(asked.id)).toBe("cancelled");
});

it("offers Withdraw on milestone requests to administrators only", async () => {
  await clear();
  const asked = okData<Receipt>(await requestMilestone());
  const rowFor = async (persona: "admin" | "owner") =>
    okData<{ readonly requests: readonly StaffRow[] }>(
      await callAs(persona, staffQueries.listProjectApprovals, {
        projectId: fixture.projectId,
      })
    ).requests.find(({ id }) => id === asked.id);
  expect(await rowFor("admin")).toMatchObject({ canCancel: true });
  expect(await rowFor("owner")).toMatchObject({ canCancel: false });
  okData(await cancel("admin", asked.id));
  expect(await rowFor("admin")).toMatchObject({
    canCancel: false,
    status: "cancelled",
  });
});

it("shows no decision form while an admin previews the portal", async () => {
  await clear();
  const asked = okData<Receipt>(await requestMilestone());
  const cookie = `${PORTAL_PREVIEW_COOKIE}=${encodeURIComponent(personaId("client"))}`;
  const previewed = okData<{ readonly canDecide: boolean }>(
    await callAsWithCookie("admin", cookie, portalQueries.getPortalApproval, {
      approvalId: asked.id,
    })
  );
  expect(previewed.canDecide).toBe(false);
  const asClient = okData<{ readonly canDecide: boolean }>(
    await callAs("client", portalQueries.getPortalApproval, {
      approvalId: asked.id,
    })
  );
  expect(asClient.canDecide).toBe(true);
  expect(await statusOf(asked.id)).toBe("pending");
});

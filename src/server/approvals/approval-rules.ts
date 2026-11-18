// The approval rules the writers enforce and the staff reads report, kept in
// one place so the drawer and project view offer exactly what the server
// accepts.

// Why a new version cannot go to a company: one is still waiting, or the
// client already approved. Pass the rows of one subject for one company; each
// company is asked separately.
export type RequestBlock = "pending" | "approved";

export const requestBlockOf = (
  rows: readonly { readonly status: string }[]
): RequestBlock | undefined => {
  if (rows.some(({ status }) => status === "pending")) {
    return "pending";
  }
  if (rows.some(({ status }) => status === "approved")) {
    return "approved";
  }
  return undefined;
};

// The companies a new version may be sent to, out of those the subject is
// shared with.
export const requestableCompanies = <Company extends { readonly id: string }>(
  companies: readonly Company[],
  rows: readonly { readonly companyId: string; readonly status: string }[]
): Company[] =>
  companies.filter(
    ({ id }) =>
      requestBlockOf(rows.filter(({ companyId }) => companyId === id)) ===
      undefined
  );

interface StaffActor {
  readonly id: string;
  readonly role: string;
}

// The person who asked and administrators may withdraw a request.
export const mayWithdraw = (
  actor: StaffActor,
  request: { readonly requestedById: string }
): boolean => actor.role === "admin" || request.requestedById === actor.id;

// Withdrawing is offered only while the client has not answered.
export const canCancel = (
  actor: StaffActor,
  request: { readonly requestedById: string; readonly status: string }
): boolean => request.status === "pending" && mayWithdraw(actor, request);

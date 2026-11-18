import { APIError } from "better-auth/api";

import { db } from "@/src/prisma/db";

import { recordAuditEvent } from "../audit/audit-log";
import {
  LOGIN_LOCK_MINUTES,
  clearExpiredLock,
  findSignInTarget,
  isDeactivated,
  isLocked,
  normalizeEmail,
  recordFailedSignIn,
  recordSuccessfulSignIn,
} from "./lockout";

export const INVALID_SIGN_IN = "Invalid email or password.";

export interface SignInContext {
  readonly body?: unknown;
  readonly headers?: Headers | undefined;
  readonly context: { readonly returned?: unknown };
}

const emailOf = (context: SignInContext): string | null => {
  const { body } = context;
  return typeof body === "object" && body !== null && "email" in body
    ? normalizeEmail(body.email)
    : null;
};

const auditBlocked = async (
  context: SignInContext,
  subjectUserId: string | null,
  reason: "deactivated" | "locked"
): Promise<void> => {
  try {
    await recordAuditEvent(db, {
      details: { reason },
      headers: context.headers ?? null,
      subjectUserId,
      type: "login_blocked",
    });
  } catch {
    // The trail must never turn a refusal into a server error.
  }
};

// A locked or deactivated account is refused before the password is checked,
// with the same message as a wrong password, so the response never confirms
// that the account exists, is unavailable, or that the password is right.
export const rejectUnavailableSignIn = async (
  context: SignInContext
): Promise<void> => {
  const email = emailOf(context);
  if (!email) {
    return;
  }
  const now = new Date();
  const target = await findSignInTarget(email);
  // The refusals below skip the after-hook, so each attempt is audited here.
  if (isDeactivated(target)) {
    await auditBlocked(context, target?.id ?? null, "deactivated");
    throw new APIError("UNAUTHORIZED", { message: INVALID_SIGN_IN });
  }
  await clearExpiredLock(target, now);
  if (isLocked(target, now)) {
    await auditBlocked(context, target?.id ?? null, "locked");
    throw new APIError("UNAUTHORIZED", { message: INVALID_SIGN_IN });
  }
};

// Counts failures, locks after too many, resets on success, and writes each
// outcome to the audit trail.
export const auditSignInOutcome = async (
  context: SignInContext
): Promise<void> => {
  const email = emailOf(context);
  if (!email) {
    return;
  }
  const now = new Date();
  const headers = context.headers ?? null;
  const target = await findSignInTarget(email);
  const failed = context.context.returned instanceof APIError;
  const subjectUserId = target?.id ?? null;
  try {
    if (failed && target && isDeactivated(target)) {
      // Deactivated after the before-hook: the session guard refused it.
      await auditBlocked(context, subjectUserId, "deactivated");
      return;
    }
    if (failed && target && isLocked(target, now)) {
      await auditBlocked(context, subjectUserId, "locked");
      return;
    }
    if (failed) {
      const outcome = target ? await recordFailedSignIn(target.id) : null;
      await recordAuditEvent(db, {
        details: target ? { attempts: outcome?.count ?? 0 } : { email },
        headers,
        subjectUserId,
        type: "login_failed",
      });
      if (outcome?.locked) {
        await recordAuditEvent(db, {
          details: { minutes: LOGIN_LOCK_MINUTES },
          headers,
          subjectUserId,
          type: "account_locked",
        });
      }
      return;
    }
    if (target) {
      await recordSuccessfulSignIn(target.id);
      await recordAuditEvent(db, {
        headers,
        subjectUserId,
        type: "login_succeeded",
      });
    }
  } catch {
    // Counting and auditing must never turn a sign-in into a server error.
  }
};

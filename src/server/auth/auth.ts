import "server-only";
import "dotenv/config";
import { betterAuth } from "better-auth";
import { APIError, createAuthMiddleware } from "better-auth/api";
import { createAccessControl } from "better-auth/plugins/access";
import { admin } from "better-auth/plugins/admin";
import { bearer } from "better-auth/plugins/bearer";

import { db } from "@/src/prisma/db";

import { RESOLVED_CLIENT_IP_HEADER } from "../core/client-ip";
import { authPool } from "./database";
import { isUserDeactivated } from "./lockout";
import {
  INVALID_SIGN_IN,
  auditSignInOutcome,
  rejectUnavailableSignIn,
} from "./sign-in-guard";

const authSecret = process.env["BETTER_AUTH_SECRET"];
if (!authSecret || authSecret.length < 32) {
  throw new Error("BETTER_AUTH_SECRET must contain at least 32 characters.");
}

const statement = {
  session: [],
  user: [],
} as const;

const accessControl = createAccessControl(statement);
const adminRole = accessControl.newRole({ session: [], user: [] });
const employeeRole = accessControl.newRole({ session: [], user: [] });
const clientRole = accessControl.newRole({ session: [], user: [] });

const unrestrictedAuthPaths = new Set([
  "/change-password",
  "/sign-out",
  "/get-session",
]);

export const auth = betterAuth({
  // Rate limits key on the address the auth route resolved from the trusted
  // proxy header, never on a client-controlled X-Forwarded-For.
  advanced: {
    ipAddress: { ipAddressHeaders: [RESOLVED_CLIENT_IP_HEADER] },
  },
  appName: "Taskora",
  baseURL: process.env["BETTER_AUTH_URL"],
  database: authPool,
  databaseHooks: {
    session: {
      create: {
        // Writer guard: no path may open a session for a deactivated user.
        before: async (session) => {
          if (await isUserDeactivated(session.userId)) {
            throw new APIError("UNAUTHORIZED", { message: INVALID_SIGN_IN });
          }
        },
      },
    },
    user: {
      create: {
        before: (user) =>
          Promise.resolve({
            data: {
              ...user,
              email: user.email.trim().toLowerCase(),
              emailNormalized: user.email.trim().toLowerCase(),
              mustChangePassword: true,
            },
          }),
      },
      update: {
        before: (user) =>
          typeof user.email === "string"
            ? Promise.resolve({
                data: {
                  ...user,
                  email: user.email.trim().toLowerCase(),
                  emailNormalized: user.email.trim().toLowerCase(),
                },
              })
            : Promise.resolve(),
      },
    },
  },
  emailAndPassword: {
    disableSignUp: true,
    enabled: true,
    maxPasswordLength: 128,
    minPasswordLength: 12,
    revokeSessionsOnPasswordReset: true,
  },
  hooks: {
    after: createAuthMiddleware(async (context) => {
      if (context.path !== "/sign-in/email") {
        return;
      }
      await auditSignInOutcome(context);
    }),
    before: createAuthMiddleware(async (context) => {
      if (context.path === "/sign-in/email") {
        await rejectUnavailableSignIn(context);
        return;
      }
      const { session } = context.context;
      if (!session) {
        return;
      }

      const user = await db.orm.public.User.where({ id: session.user.id })
        .select("deactivatedAt", "mustChangePassword")
        .first();

      if (!user || user.deactivatedAt) {
        throw new APIError("UNAUTHORIZED", {
          message: "This account is unavailable.",
        });
      }

      if (unrestrictedAuthPaths.has(context.path)) {
        return;
      }

      if (user.mustChangePassword) {
        throw new APIError("FORBIDDEN", {
          message: "Change your password before continuing.",
        });
      }
    }),
  },
  plugins: [
    admin({
      ac: accessControl,
      adminRoles: ["admin"],
      defaultRole: "employee",
      roles: { admin: adminRole, client: clientRole, employee: employeeRole },
    }),
    // The mobile app sends the same database session as an Authorization
    // header, so revocation and expiry behave exactly as they do for cookies.
    bearer(),
  ],
  rateLimit: {
    customRules: {
      "/change-password": { max: 5, window: 60 },
      "/sign-in/email": { max: 5, window: 60 },
    },
    enabled: true,
    max: 100,
    storage: "database",
    window: 60,
  },
  secret: authSecret,
  session: {
    cookieCache: { enabled: false },
    expiresIn: 60 * 60 * 8,
    updateAge: 60 * 60 * 8 + 1,
  },
  trustedOrigins: process.env["BETTER_AUTH_TRUSTED_ORIGINS"]
    ?.split(",")
    .map((origin) => origin.trim())
    .filter(Boolean),
  user: {
    additionalFields: {
      clientCompanyId: { input: false, required: false, type: "string" },
      deactivatedAt: {
        input: false,
        required: false,
        returned: false,
        type: "date",
      },
      deactivatedById: {
        input: false,
        required: false,
        returned: false,
        type: "string",
      },
      emailNormalized: {
        input: false,
        required: false,
        returned: false,
        type: "string",
      },
      employeeNumber: { input: false, type: "number" },
      jobTitle: { input: false, required: false, type: "string" },
      mustChangePassword: { input: false, type: "boolean" },
      teamId: { input: false, required: false, type: "string" },
      timeZone: { required: false, type: "string" },
    },
    deleteUser: { enabled: false },
  },
});

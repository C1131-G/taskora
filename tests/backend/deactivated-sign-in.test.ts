import { expect, it } from "bun:test";

import { auth } from "../../src/server/auth/auth";
import { authPool, personaId } from "./support/action-harness";
import {
  auditTypes,
  createClient,
  installHooks,
  loginState,
  signIn,
} from "./support/client-security-fixtures";

installHooks();

const setDeactivated = async (
  userId: string,
  deactivated: boolean
): Promise<void> => {
  await authPool.query(
    deactivated
      ? 'UPDATE "user" SET "deactivatedAt" = now(), "deactivatedById" = $2 WHERE id = $1'
      : 'UPDATE "user" SET "deactivatedAt" = NULL, "deactivatedById" = NULL WHERE id = $1',
    deactivated ? [userId, personaId("admin")] : [userId]
  );
};

const sessionCount = async (userId: string): Promise<number> => {
  const result = await authPool.query<{ count: string }>(
    'SELECT count(*) AS count FROM session WHERE "userId" = $1',
    [userId]
  );
  return Number(result.rows[0]?.count ?? 0);
};

it("refuses a deactivated account with the right password before any session exists", async () => {
  const client = await createClient();
  await setDeactivated(client.id, true);

  const refused = await signIn(client.email, client.password);
  expect(refused.status).toBe(401);
  const wrong = await signIn(client.email, "not-the-password-1!");
  expect(wrong.status).toBe(401);
  // Same answer as a wrong password: the response does not confirm the password.
  expect(await refused.json()).toEqual(await wrong.json());

  expect(await sessionCount(client.id)).toBe(0);
  const state = await loginState(client.id);
  expect(state.failedLoginCount).toBe(0);
  expect(state.lastActiveAt).toBeNull();
  expect(await auditTypes(client.id)).toEqual([
    "login_blocked",
    "login_blocked",
  ]);
});

it("never writes a session for a deactivated user, whatever path asks", async () => {
  const client = await createClient();
  await setDeactivated(client.id, true);
  const context = await auth.$context;

  await expect(
    context.internalAdapter.createSession(client.id)
  ).rejects.toThrow("Invalid email or password.");
  expect(await sessionCount(client.id)).toBe(0);
});

it("signs in again once the account is reactivated", async () => {
  const client = await createClient();
  await setDeactivated(client.id, true);
  const refused = await signIn(client.email, client.password);
  expect(refused.status).toBe(401);

  await setDeactivated(client.id, false);
  const success = await signIn(client.email, client.password);
  expect(success.status).toBe(200);
  expect(await sessionCount(client.id)).toBe(1);
  const types = await auditTypes(client.id);
  expect(types.at(-1)).toBe("login_succeeded");
});

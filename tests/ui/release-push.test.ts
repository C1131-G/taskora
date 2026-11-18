import { expect, test } from "bun:test";

import type { PushDevice } from "@/features/notifications/release-push";
import { releasePushForThisDevice } from "@/features/notifications/release-push";

const deviceWith = (endpoint: string | null) => {
  const calls: string[] = [];
  const device: PushDevice = {
    getRegistration: () =>
      Promise.resolve({
        pushManager: {
          getSubscription: () =>
            Promise.resolve(
              endpoint === null
                ? null
                : {
                    endpoint,
                    unsubscribe: () => {
                      calls.push("unsubscribe");
                      return Promise.resolve(true);
                    },
                  }
            ),
        },
      }),
  };
  return { calls, device };
};

test("removes the account's endpoint, then drops the browser subscription", async () => {
  const { calls, device } = deviceWith("https://push.example/abc");
  await releasePushForThisDevice((input) => {
    calls.push(`remove:${input.endpoint}`);
    return Promise.resolve({ ok: true });
  }, device);
  expect(calls).toEqual(["remove:https://push.example/abc", "unsubscribe"]);
});

test("still drops the browser subscription when the server refuses", async () => {
  const { calls, device } = deviceWith("https://push.example/abc");
  await releasePushForThisDevice(
    () => Promise.reject(new Error("forbidden")),
    device
  );
  expect(calls).toEqual(["unsubscribe"]);
});

test("does nothing without a subscription or service workers, and never throws", async () => {
  const { calls, device } = deviceWith(null);
  let removed = 0;
  const remove = () => {
    removed += 1;
    return Promise.resolve();
  };
  await releasePushForThisDevice(remove, device);
  // Bun has no service workers, so the default browser device is absent.
  await releasePushForThisDevice(remove);
  await releasePushForThisDevice(remove, {
    getRegistration: () => Promise.reject(new Error("blocked")),
  });
  expect(removed).toBe(0);
  expect(calls).toEqual([]);
});

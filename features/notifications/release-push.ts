// What signing out needs from the browser's service workers; the real
// `navigator.serviceWorker` satisfies it.
export interface PushDevice {
  readonly getRegistration: () => Promise<
    | {
        readonly pushManager: {
          readonly getSubscription: () => Promise<{
            readonly endpoint: string;
            readonly unsubscribe: () => Promise<boolean>;
          } | null>;
        };
      }
    | undefined
  >;
}

export type RemovePushOnServer = (input: {
  readonly endpoint: string;
  readonly idempotencyKey: string;
}) => Promise<unknown>;

const browserPushDevice = (): PushDevice | undefined =>
  typeof navigator !== "undefined" && "serviceWorker" in navigator
    ? navigator.serviceWorker
    : undefined;

// Signing out releases push on this device: the account's row for this
// endpoint is removed while the session still exists, and the browser
// subscription is dropped even if that removal fails, so the push service
// refuses further sends and delivery deletes any row left behind. It never
// blocks the sign-out.
export const releasePushForThisDevice = async (
  removeOnServer: RemovePushOnServer,
  device: PushDevice | undefined = browserPushDevice()
): Promise<void> => {
  try {
    const registration = await device?.getRegistration();
    const subscription = await registration?.pushManager.getSubscription();
    if (!subscription) {
      return;
    }
    try {
      await removeOnServer({
        endpoint: subscription.endpoint,
        idempotencyKey: crypto.randomUUID(),
      });
    } catch {
      // The browser subscription below is still dropped.
    }
    await subscription.unsubscribe();
  } catch {
    // Releasing push must never stop the user from signing out.
  }
};

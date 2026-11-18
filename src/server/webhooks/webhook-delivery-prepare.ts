import { AppError } from "../core/action-result";
import { formatSlackMessage } from "./webhook-events";
import type { WebhookEvent } from "./webhook-events";
import { validateDestination } from "./webhook-internal";
import { decryptSecret } from "./webhook-secret";
import { signWebhook } from "./webhook-signing";

const USER_AGENT = "Taskora-Webhooks/1";

interface SigningDeps {
  readonly now: () => Date;
  readonly keyMaterial: string;
  readonly production: boolean;
}

export interface Prepared {
  readonly url: URL;
  readonly headers: Record<string, string>;
  readonly body: string;
}

export const prepare = (
  event: WebhookEvent,
  endpoint: {
    readonly kind: string;
    readonly url: string;
    readonly secretCiphertext: string | null;
  },
  deps: SigningDeps
): Prepared => {
  const slack = endpoint.kind === "slack";
  const body = JSON.stringify(slack ? formatSlackMessage(event) : event);
  const headers: Record<string, string> = {
    accept: "*/*",
    "content-type": "application/json",
    "user-agent": USER_AGENT,
  };
  if (!slack) {
    if (!endpoint.secretCiphertext) {
      throw new AppError({
        code: "VALIDATION_FAILED",
        message: "The endpoint has no signing secret.",
      });
    }
    const timestamp = Math.floor(deps.now().getTime() / 1000);
    const secret = decryptSecret(endpoint.secretCiphertext, deps.keyMaterial);
    headers["x-taskora-delivery"] = event.id;
    headers["x-taskora-event"] = event.type;
    headers["x-taskora-signature"] = signWebhook(secret, timestamp, body);
    headers["x-taskora-timestamp"] = String(timestamp);
  }
  // Same rules as when the admin saved it, applied again because the stored
  // row or the deployment mode may have changed since.
  const url = new URL(
    validateDestination(
      slack ? "slack" : "generic",
      endpoint.url,
      deps.production
    )
  );
  return { body, headers, url };
};

"use client";

/* eslint-disable shadcn/no-restyle -- Preserve established portal classes on shared controls. */

/* eslint-disable shadcn/no-unknown-classes -- Portal classes are authored in apps/web/app/workspace-styles/portal.css. */

import { useEffect, useState, useSyncExternalStore } from "react";
import { toast } from "sonner";

import { ErrorToast } from "@/components/workspace/error-toast";
import { WorkspaceButton } from "@/components/workspace/workspace-button";
import { PUSH_COPY } from "@/features/portal/components/portal-account-copy";
import {
  registerPortalPushAction,
  removePortalPushAction,
} from "@/features/portal/portal-push-actions";

const decodeApplicationServerKey = (encoded: string): ArrayBuffer => {
  const padding = "=".repeat((4 - (encoded.length % 4)) % 4);
  const base64 = `${encoded.replaceAll("-", "+").replaceAll("_", "/")}${padding}`;
  const binary = atob(base64);
  const bytes = new Uint8Array(new ArrayBuffer(binary.length));
  for (const [index, character] of [...binary].entries()) {
    bytes[index] = character.codePointAt(0) ?? 0;
  }
  return bytes.buffer;
};

type Capability = "denied" | "ok" | "unsupported";

const unsubscribe = () => {
  // Nothing changes while the page is open, so there is nothing to release.
};
const subscribeNothing = () => unsubscribe;

const readCapability = (publicKey: string): Capability => {
  if (
    !publicKey ||
    !("serviceWorker" in navigator) ||
    !("PushManager" in window) ||
    !("Notification" in window)
  ) {
    return "unsupported";
  }
  return Notification.permission === "denied" ? "denied" : "ok";
};

const PortalPushControl = ({ publicKey }: { readonly publicKey: string }) => {
  // Without a key the server already knows push is unavailable, so the panel
  // renders empty from the first paint instead of collapsing after hydration.
  const capability = useSyncExternalStore<Capability | "checking">(
    subscribeNothing,
    () => readCapability(publicKey),
    () => (publicKey ? "checking" : "unsupported")
  );
  const [subscribed, setSubscribed] = useState<boolean>();
  const [denied, setDenied] = useState(false);
  const [message, setMessage] = useState("");
  const [pending, setPending] = useState(false);

  useEffect(() => {
    if (capability !== "ok") {
      return;
    }
    let cancelled = false;
    const check = async () => {
      try {
        const registration = await navigator.serviceWorker.register("/sw.js");
        const existing = await registration.pushManager.getSubscription();
        if (!cancelled) {
          setSubscribed(existing !== null);
        }
      } catch {
        if (!cancelled) {
          toast.error("Push notifications could not be initialized.");
        }
      }
    };
    void check();
    return () => {
      cancelled = true;
    };
  }, [capability]);

  const enable = async () => {
    const permission = await Notification.requestPermission();
    if (permission !== "granted") {
      setDenied(permission === "denied");
      toast.error("Allow notifications in your browser to turn them on.");
      return;
    }
    const registration = await navigator.serviceWorker.ready;
    // The subscription is intentionally persistent so push survives navigation.
    // oxlint-disable-next-line react-doctor/effect-needs-cleanup
    const subscription = await registration.pushManager.subscribe({
      applicationServerKey: decodeApplicationServerKey(publicKey),
      userVisibleOnly: true,
    });
    const { keys } = subscription.toJSON();
    if (!keys?.auth || !keys.p256dh) {
      toast.error("Your browser returned an invalid push subscription.");
      return;
    }
    const result = await registerPortalPushAction({
      endpoint: subscription.endpoint,
      idempotencyKey: crypto.randomUUID(),
      keys: { auth: keys.auth, p256dh: keys.p256dh },
      userAgent: navigator.userAgent,
    });
    if (result.ok) {
      setSubscribed(true);
      setMessage("Push notifications are on for this device.");
    } else {
      await subscription.unsubscribe();
      toast.error(result.error.message);
    }
  };

  const disable = async () => {
    const registration = await navigator.serviceWorker.ready;
    const subscription = await registration.pushManager.getSubscription();
    if (subscription) {
      const result = await removePortalPushAction({
        endpoint: subscription.endpoint,
        idempotencyKey: crypto.randomUUID(),
      });
      if (!result.ok) {
        toast.error(result.error.message);
        return;
      }
      await subscription.unsubscribe();
    }
    setSubscribed(false);
    setMessage("Push notifications are off for this device.");
  };

  const toggle = async () => {
    setPending(true);
    setMessage("");
    try {
      await (subscribed ? disable() : enable());
    } catch {
      toast.error("Push notifications could not be changed. Try again later.");
    }
    setPending(false);
  };

  if (capability === "unsupported") {
    return (
      <ErrorToast message="Push notifications are not available in this browser." />
    );
  }
  if (capability === "denied" || denied) {
    return (
      <ErrorToast message="Notifications are blocked for this site. Allow them in your browser settings to turn on push notifications." />
    );
  }

  return (
    <div className="portal-stack">
      <p className="muted">{PUSH_COPY}</p>
      <div>
        <WorkspaceButton
          aria-pressed={subscribed === true}
          className="btn btn-secondary"
          disabled={pending || subscribed === undefined}
          onClick={toggle}
          type="button"
        >
          {subscribed
            ? "Turn off push notifications"
            : "Turn on push notifications"}
        </WorkspaceButton>
      </div>
      <output aria-live="polite" className="hint">
        {message}
      </output>
    </div>
  );
};

export { PortalPushControl };

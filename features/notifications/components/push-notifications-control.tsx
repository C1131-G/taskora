"use client";

/* eslint-disable shadcn/no-restyle */

import { useEffect, useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { registerPushSubscriptionAction } from "@/features/notifications/notifications-actions";

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

// Subscribes this browser and registers it; reports whether push is now on.
const subscribeAndRegister = async (publicKey: string): Promise<boolean> => {
  try {
    const permission = await Notification.requestPermission();
    if (permission !== "granted") {
      toast.error("Allow notifications in your browser to enable them here.");
      return false;
    }
    const registration = await navigator.serviceWorker.ready;
    // This subscription is intentionally persistent so push survives component unmounts.
    // oxlint-disable-next-line react-doctor/effect-needs-cleanup
    const subscription = await registration.pushManager.subscribe({
      applicationServerKey: decodeApplicationServerKey(publicKey),
      userVisibleOnly: true,
    });
    const { keys } = subscription.toJSON();
    if (!keys?.auth || !keys.p256dh) {
      toast.error("Your browser returned an invalid push subscription.");
      return false;
    }
    const result = await registerPushSubscriptionAction({
      endpoint: subscription.endpoint,
      idempotencyKey: crypto.randomUUID(),
      keys: { auth: keys.auth, p256dh: keys.p256dh },
      userAgent: navigator.userAgent,
    });
    if (!result.ok) {
      toast.error(result.error.message);
    }
    return result.ok;
  } catch {
    toast.error("Notifications could not be enabled. Try again later.");
    return false;
  }
};

// One request at a time; enabling again re-registers the same endpoint.
type EnableStatus = "idle" | "pending" | "enabled";

const PushNotificationsControl = ({ publicKey }: { publicKey: string }) => {
  const [available, setAvailable] = useState(false);
  const [status, setStatus] = useState<EnableStatus>("idle");
  useEffect(() => {
    if (
      !publicKey ||
      !("serviceWorker" in navigator) ||
      !("PushManager" in window) ||
      !("Notification" in window) ||
      Notification.permission === "denied"
    ) {
      return;
    }

    // Only the workspace shell mounts this, after WorkspaceFrame has gated the
    // session, so no client-side session check is needed.
    let cancelled = false;
    const registerServiceWorker = async () => {
      try {
        await navigator.serviceWorker.register("/sw.js");
        if (!cancelled) {
          setAvailable(true);
        }
      } catch {
        if (!cancelled) {
          toast.error("Push notifications could not be initialized.");
        }
      }
    };
    void registerServiceWorker();

    return () => {
      cancelled = true;
    };
  }, [publicKey]);

  const enableNotifications = async () => {
    if (!publicKey || status === "pending") {
      return;
    }
    const wasEnabled = status === "enabled";
    setStatus("pending");
    const enabled = await subscribeAndRegister(publicKey);
    setStatus(enabled || wasEnabled ? "enabled" : "idle");
  };

  if (!available) {
    return null;
  }

  return (
    <aside className="fixed right-4 bottom-4 z-50 flex max-w-sm flex-col items-end gap-2">
      <output aria-live="polite" className="text-sm">
        {status === "enabled" ? "Notifications are enabled." : ""}
      </output>
      <Button
        aria-busy={status === "pending"}
        variant="outline"
        className="rounded-md border bg-background px-4 py-2 text-sm shadow-sm focus-visible:outline-2 focus-visible:outline-offset-2"
        disabled={status === "pending"}
        onClick={enableNotifications}
        type="button"
      >
        Enable notifications
      </Button>
    </aside>
  );
};

export { PushNotificationsControl };

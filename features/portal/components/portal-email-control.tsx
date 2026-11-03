"use client";

/* eslint-disable shadcn/no-restyle -- Preserve established portal classes on shared controls. */

/* eslint-disable shadcn/no-unknown-classes -- Portal classes are authored in apps/web/app/workspace-styles/portal.css. */

import { useOptimistic, useState, useTransition } from "react";
import { toast } from "sonner";

import { WorkspaceButton } from "@/components/workspace/workspace-button";
import { setPortalEmailUpdatesAction } from "@/features/portal/portal-notification-actions";

const PortalEmailControl = ({ enabled }: { readonly enabled: boolean }) => {
  const [pending, startTransition] = useTransition();
  const [message, setMessage] = useState("");
  const [on, setOptimisticOn] = useOptimistic(
    enabled,
    (_current, next: boolean) => next
  );

  const toggle = () => {
    const next = !on;
    setMessage("");
    startTransition(async () => {
      setOptimisticOn(next);
      try {
        const result = await setPortalEmailUpdatesAction({
          enabled: next,
          idempotencyKey: crypto.randomUUID(),
        });
        if (result.ok) {
          setMessage(`Email updates are ${next ? "on" : "off"}.`);
        } else {
          toast.error(result.error.message);
        }
      } catch {
        toast.error("Email updates could not be changed. Try again.");
      }
    });
  };

  return (
    <div className="portal-stack">
      <p className="muted">
        Get an email when the status of one of your bugs changes. Every email
        has an unsubscribe link.
      </p>
      <div>
        <WorkspaceButton
          aria-pressed={on}
          className="btn btn-secondary"
          disabled={pending}
          onClick={toggle}
          type="button"
        >
          {on ? "Turn off email updates" : "Turn on email updates"}
        </WorkspaceButton>
      </div>
      <output aria-live="polite" className="hint">
        {message}
      </output>
    </div>
  );
};

export { PortalEmailControl };

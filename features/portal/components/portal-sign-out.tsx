"use client";

/* eslint-disable shadcn/no-restyle -- Preserve established portal classes on shared controls. */

/* eslint-disable shadcn/no-unknown-classes -- Portal classes are authored in apps/web/app/workspace-styles/portal.css. */

import { SignOut } from "@phosphor-icons/react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";

import { WorkspaceButton } from "@/components/workspace/workspace-button";
import { releasePushForThisDevice } from "@/features/notifications/release-push";
import { removePortalPushAction } from "@/features/portal/portal-push-actions";
import { authClient } from "@/src/client/auth-client";

const PortalSignOut = () => {
  const router = useRouter();
  const [pending, setPending] = useState(false);

  const signOut = async () => {
    setPending(true);
    try {
      await releasePushForThisDevice(removePortalPushAction);
      const result = await authClient.signOut();
      if (result.error) {
        toast.error("Sign-out failed. Try again.");
      } else {
        router.replace("/login");
        router.refresh();
        return;
      }
    } catch {
      toast.error("Sign-out failed. Try again.");
    }
    setPending(false);
  };

  return (
    <div className="portal-stack">
      <div>
        <WorkspaceButton
          aria-busy={pending}
          className="btn btn-secondary"
          disabled={pending}
          onClick={signOut}
          type="button"
        >
          <SignOut aria-hidden="true" size={14} />
          {pending ? "Signing out…" : "Sign out"}
        </WorkspaceButton>
      </div>
    </div>
  );
};

export { PortalSignOut };

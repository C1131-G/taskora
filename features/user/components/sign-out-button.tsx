"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { removePushSubscriptionAction } from "@/features/notifications/notifications-actions";
import { releasePushForThisDevice } from "@/features/notifications/release-push";
import { authClient } from "@/src/client/auth-client";

const SignOutButton = () => {
  const router = useRouter();
  const [pending, setPending] = useState(false);

  const signOut = async () => {
    setPending(true);
    try {
      await releasePushForThisDevice(removePushSubscriptionAction);
      const result = await authClient.signOut();
      if (result.error) {
        toast.error("Sign-out failed. Try again.");
      } else {
        router.replace("/login");
        router.refresh();
      }
    } catch {
      toast.error("Sign-out failed. Try again.");
    }
    setPending(false);
  };

  return (
    <div className="flex flex-col items-start gap-2">
      <Button
        aria-busy={pending}
        className="min-w-32"
        disabled={pending}
        onClick={signOut}
        type="button"
        variant="outline"
      >
        {pending ? "Signing out…" : "Sign out"}
      </Button>
    </div>
  );
};

export { SignOutButton };

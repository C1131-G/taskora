"use client";

/* eslint-disable shadcn/no-restyle, shadcn/no-unknown-classes -- Auth screens are styled by features/user/styles/*.css. */

import { SignOut } from "@phosphor-icons/react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { authClient } from "@/src/client/auth-client";

const AuthSignOutButton = () => {
  const router = useRouter();
  const [pending, setPending] = useState(false);

  const signOut = async () => {
    setPending(true);
    try {
      const result = await authClient.signOut();
      if (!result.error) {
        router.replace("/login");
        router.refresh();
        return;
      }
    } catch {
      // The failure is reported below.
    }
    toast.error("Sign-out failed. Try again.");
    setPending(false);
  };

  let label = "Sign out";
  if (pending) {
    label = "Signing out…";
  }

  return (
    <Button
      aria-busy={pending}
      className="auth-ghost"
      disabled={pending}
      onClick={signOut}
      type="button"
      variant="ghost"
    >
      <SignOut aria-hidden="true" size={14} />
      <span aria-live="polite">{label}</span>
    </Button>
  );
};

export { AuthSignOutButton };

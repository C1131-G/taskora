/* eslint-disable shadcn/no-unknown-classes */
/* eslint-disable shadcn/no-restyle */

"use client";

import { Check, Copy } from "@phosphor-icons/react";
import { useState } from "react";
import { toast } from "sonner";

import { WorkspaceButton } from "@/components/workspace/workspace-button";

export const MemberProfileCopyEmail = ({
  email,
}: {
  readonly email: string;
}) => {
  const [copied, setCopied] = useState(false);

  const copyEmail = async () => {
    try {
      await navigator.clipboard.writeText(email);
      setCopied(true);
    } catch {
      setCopied(false);
      toast.error("Could not copy email address.");
    }
  };

  return (
    <div className="member-profile-copy-email">
      <WorkspaceButton
        aria-label={copied ? "Email copied" : "Copy email address"}
        className="btn btn-secondary btn-sm"
        onClick={copyEmail}
        type="button"
      >
        {copied ? (
          <Check aria-hidden="true" size={14} />
        ) : (
          <Copy aria-hidden="true" size={14} />
        )}
        {copied ? "Copied" : "Copy email"}
      </WorkspaceButton>
    </div>
  );
};

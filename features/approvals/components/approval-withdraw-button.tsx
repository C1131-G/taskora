/* eslint-disable shadcn/no-unknown-classes */
/* eslint-disable shadcn/no-restyle */

"use client";

import { useTransition } from "react";
import { toast } from "sonner";

import { WorkspaceButton } from "@/components/workspace/workspace-button";
import { cancelApprovalAction } from "@/features/approvals/approval-actions";

// Withdraws a request the client has not answered. Rendered only where the
// server said this reader may (`canCancel`); the server still checks.
export const ApprovalWithdrawButton = ({
  onChanged,
  requestId,
}: {
  // Reloads data the caller keeps itself; the action already refreshes the
  // page's server data.
  readonly onChanged?: () => Promise<void>;
  readonly requestId: string;
}) => {
  const [pending, startTransition] = useTransition();

  const cancel = () => {
    startTransition(async () => {
      try {
        const result = await cancelApprovalAction({
          idempotencyKey: crypto.randomUUID(),
          requestId,
        });
        if (!result.ok) {
          toast.error(result.error.message);
          return;
        }
        await onChanged?.();
      } catch {
        toast.error(
          "The approval request could not be withdrawn or refreshed. Try again."
        );
      }
    });
  };

  return (
    <div className="row">
      <WorkspaceButton
        aria-busy={pending || undefined}
        className="btn"
        disabled={pending}
        onClick={cancel}
        type="button"
      >
        {pending ? "Withdrawing…" : "Withdraw request"}
      </WorkspaceButton>
    </div>
  );
};

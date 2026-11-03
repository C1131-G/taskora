/* eslint-disable shadcn/no-unknown-classes, shadcn/no-restyle -- Workspace classes are defined in apps/web/app/workspace-styles. */

"use client";

import { LockOpen } from "@phosphor-icons/react";
import { useTransition } from "react";
import { toast } from "sonner";

import { EmptyState } from "@/components/workspace/empty-state";
import { WorkspaceButton } from "@/components/workspace/workspace-button";
import { unlockUserAction } from "@/features/clients/clients-actions";

interface LockedAccount {
  readonly clientCompanyName: string | null;
  readonly email: string;
  readonly failedLoginCount: number;
  readonly id: string;
  readonly lockedUntil: string;
  readonly name: string;
}

const timeFormatter = new Intl.DateTimeFormat(undefined, {
  dateStyle: "medium",
  timeStyle: "short",
});

const LockedAccountRow = ({ account }: { readonly account: LockedAccount }) => {
  const [pending, startTransition] = useTransition();

  const unlock = () =>
    startTransition(async () => {
      try {
        const result = await unlockUserAction({ userId: account.id });
        if (!result.ok) {
          toast.error(result.error.message);
        }
      } catch {
        toast.error("The account could not be unlocked. Try again.");
      }
    });

  return (
    <li className="audit-locked-row">
      <div className="audit-locked-info">
        <strong>{account.name}</strong>
        <span>{account.email}</span>
        <span className="muted">
          {account.clientCompanyName ?? "Internal account"} ·{" "}
          {account.failedLoginCount} failed{" "}
          {account.failedLoginCount === 1 ? "attempt" : "attempts"} · Locked
          until {timeFormatter.format(new Date(account.lockedUntil))}
        </span>
      </div>
      <WorkspaceButton
        aria-label={`Unlock ${account.name}`}
        className="btn btn-sm btn-secondary"
        disabled={pending}
        onClick={unlock}
        type="button"
      >
        {pending ? "Unlocking…" : "Unlock"}
      </WorkspaceButton>
    </li>
  );
};

const LockedAccountsPanel = ({
  accounts,
}: {
  readonly accounts: readonly LockedAccount[];
}) => (
  <section
    aria-labelledby="locked-accounts-heading"
    className="panel clients-panel"
  >
    <div className="panel-h clients-panel-h">
      <div>
        <h2 id="locked-accounts-heading">Locked accounts</h2>
        <p className="muted">
          Accounts lock for 15 minutes after 5 failed sign-ins.
        </p>
      </div>
    </div>
    {accounts.length ? (
      <ul className="audit-locked-list">
        {accounts.map((account) => (
          <LockedAccountRow account={account} key={account.id} />
        ))}
      </ul>
    ) : (
      <EmptyState
        description="Accounts locked after repeated failed sign-ins show here."
        icon={LockOpen}
        size="compact"
        title="No locked accounts"
      />
    )}
  </section>
);

export { LockedAccountsPanel };

/* eslint-disable shadcn/no-unknown-classes */
/* eslint-disable shadcn/no-restyle */

"use client";

import { Devices } from "@phosphor-icons/react";
import { useTransition } from "react";
import { toast } from "sonner";

import { EmptyState } from "@/components/workspace/empty-state";
import { LocalTime } from "@/components/workspace/local-time";
import { WorkspaceButton } from "@/components/workspace/workspace-button";
import { WorkspaceConfirmDialog } from "@/components/workspace/workspace-confirm-dialog";
import { revokeSessionAction } from "@/features/user/user-actions";

interface SessionSummary {
  readonly id: string;
  readonly createdAt: string;
  readonly expiresAt: string;
  readonly ipAddress: string | null;
  readonly userAgent: string | null;
}

export const SessionList = ({
  sessions,
}: {
  readonly sessions: readonly SessionSummary[];
}) => {
  const [pending, startTransition] = useTransition();

  const revoke = (sessionId: string) =>
    startTransition(async () => {
      try {
        const result = await revokeSessionAction({ sessionId });
        if (!result.ok) {
          toast.error(result.error.message);
        }
      } catch {
        toast.error("The session could not be revoked. Try again.");
      }
    });

  return (
    <section className="panel">
      <div className="panel-h">
        <h2>Active sessions</h2>
      </div>
      {sessions.length ? (
        sessions.map((session) => (
          <article className="mini" key={session.id}>
            <div className="grow">
              <strong>{session.userAgent || "Browser session"}</strong>
              <div className="muted">
                Started <LocalTime value={session.createdAt} /> ·{" "}
                {session.ipAddress ?? "Unknown network"}
              </div>
              <div className="muted">
                Expires <LocalTime value={session.expiresAt} />
              </div>
            </div>
            <WorkspaceConfirmDialog
              confirmLabel="Revoke session"
              description={`Sign out ${session.userAgent || "this browser session"}? It must sign in again to continue.`}
              onConfirm={() => revoke(session.id)}
              title="Revoke session"
            >
              <WorkspaceButton
                className="btn btn-sm btn-secondary"
                disabled={pending}
                type="button"
              >
                Revoke
              </WorkspaceButton>
            </WorkspaceConfirmDialog>
          </article>
        ))
      ) : (
        <EmptyState
          description="Devices you sign in on appear here so you can sign them out."
          icon={Devices}
          size="compact"
          title="No active sessions"
        />
      )}
    </section>
  );
};

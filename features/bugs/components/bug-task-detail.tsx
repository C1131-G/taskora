/* eslint-disable shadcn/no-unknown-classes -- Error and muted styles come from apps/web/app/workspace-styles. */

"use client";

import { useRef, useState } from "react";

import { ErrorToast } from "@/components/workspace/error-toast";
import { BugDetailWorkflow } from "@/features/bugs/components/bug-detail-workflow";
import type { BugHistorySchema } from "@/src/server/work/bug-history";

type BugHistory = typeof BugHistorySchema.Type;

export const BugTaskDetail = ({
  employees,
  history,
  isAdmin,
  onRefresh,
  userId,
}: {
  readonly employees: readonly { readonly id: string; readonly name: string }[];
  readonly history: BugHistory | null;
  readonly isAdmin: boolean;
  readonly onRefresh: () => void;
  readonly userId: string;
}) => {
  const [refreshError, setRefreshError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const refreshInFlight = useRef(false);

  const refresh = async () => {
    if (refreshInFlight.current) {
      return;
    }
    refreshInFlight.current = true;
    setPending(true);
    setRefreshError(null);
    try {
      await onRefresh();
      setRefreshError(null);
    } catch {
      setRefreshError("Bug history could not be refreshed. Try again.");
    }
    refreshInFlight.current = false;
    setPending(false);
  };

  if (refreshError) {
    return (
      <ErrorToast
        action={{ label: "Retry", onClick: refresh }}
        message={refreshError}
      />
    );
  }
  if (!history) {
    return (
      <div className="row">
        <ErrorToast message="Bug history is unavailable." />
        <button disabled={pending} onClick={refresh} type="button">
          {pending ? "Retrying…" : "Retry bug history"}
        </button>
      </div>
    );
  }
  return (
    <BugDetailWorkflow
      embedded
      employees={employees}
      history={history}
      isAdmin={isAdmin}
      userId={userId}
      onRefresh={refresh}
    />
  );
};

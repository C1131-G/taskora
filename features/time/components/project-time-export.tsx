/* eslint-disable shadcn/no-unknown-classes */
/* eslint-disable shadcn/no-restyle */

"use client";

import { DownloadSimple } from "@phosphor-icons/react";
import { useTransition } from "react";
import { toast } from "sonner";

import { WorkspaceButton } from "@/components/workspace/workspace-button";
import { getProjectTimeCsvAction } from "@/features/time/time-actions";
import { saveCsv } from "@/lib/save-csv";

export const ProjectTimeExport = ({
  from,
  projectId,
  projectKey,
  to,
}: {
  readonly from: string;
  readonly projectId: string;
  readonly projectKey: string;
  readonly to: string;
}) => {
  const [pending, startTransition] = useTransition();

  const download = () =>
    startTransition(async () => {
      try {
        const result = await getProjectTimeCsvAction({ from, projectId, to });
        if (!result.ok) {
          toast.error(result.error.message);
          return;
        }
        saveCsv(
          result.data,
          `${projectKey.toLowerCase()}-time-${from}-to-${to}.csv`
        );
      } catch {
        toast.error("The time report could not be exported. Try again.");
      }
    });

  return (
    <WorkspaceButton
      aria-busy={pending || undefined}
      className="btn btn-secondary btn-sm"
      disabled={pending}
      onClick={download}
      type="button"
    >
      <DownloadSimple aria-hidden="true" size={14} />
      {pending ? "Exporting…" : "Export CSV"}
    </WorkspaceButton>
  );
};

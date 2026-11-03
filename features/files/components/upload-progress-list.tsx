/* eslint-disable shadcn/no-unknown-classes */

"use client";

import { Progress } from "@/components/ui/progress";
import { ErrorToast } from "@/components/workspace/error-toast";
import { WorkspaceButton } from "@/components/workspace/workspace-button";
import { uploadPercent } from "@/features/files/upload-store";
import type { UploadItem } from "@/features/files/upload-store";

const statusLabel = (upload: UploadItem): string => {
  if (upload.status === "done") {
    return "Uploaded";
  }
  if (upload.status === "finalizing") {
    return "Finishing upload…";
  }
  if (upload.status === "cancelled") {
    return "Cancelled";
  }
  return `${uploadPercent(upload)}%`;
};

export const UploadProgressList = ({
  onCancel,
  onClearFinished,
  onDismiss,
  onRetry,
  uploads,
}: {
  readonly onCancel: (id: string) => void;
  readonly onClearFinished: () => void;
  readonly onDismiss: (id: string) => void;
  readonly onRetry: (id: string) => void;
  readonly uploads: readonly UploadItem[];
}) => {
  if (uploads.length === 0) {
    return null;
  }
  const finished = uploads.some(
    (upload) => upload.status !== "uploading" && upload.status !== "finalizing"
  );
  return (
    <section aria-label="Uploads" className="panel-b stack upload-list">
      <ul className="stack">
        {uploads.map((upload) => (
          <li className="stack" key={upload.id}>
            <ErrorToast
              action={{
                label:
                  upload.status === "refresh-error" ? "Refresh list" : "Retry",
                onClick: () => onRetry(upload.id),
              }}
              message={
                upload.status === "error" || upload.status === "refresh-error"
                  ? `${upload.name}: ${upload.error ?? "Upload failed"}`
                  : null
              }
            />
            <div className="row">
              <span className="trunc grow">{upload.name}</span>
              {upload.status === "error" ||
              upload.status === "refresh-error" ? null : (
                <span className="muted">{statusLabel(upload)}</span>
              )}
              {upload.status === "uploading" ? (
                <WorkspaceButton
                  aria-label={`Cancel upload of ${upload.name}`}
                  onClick={() => onCancel(upload.id)}
                  size="sm"
                  type="button"
                  workspace
                >
                  Cancel
                </WorkspaceButton>
              ) : null}
              {upload.status !== "uploading" &&
              upload.status !== "finalizing" ? (
                <>
                  {upload.status === "done" ? null : (
                    <WorkspaceButton
                      aria-label={`${upload.status === "refresh-error" ? "Refresh file list for" : "Retry upload of"} ${upload.name}`}
                      onClick={() => onRetry(upload.id)}
                      size="sm"
                      type="button"
                      workspace
                    >
                      {upload.status === "refresh-error"
                        ? "Refresh list"
                        : "Retry"}
                    </WorkspaceButton>
                  )}
                  <WorkspaceButton
                    aria-label={`Dismiss ${upload.name}`}
                    onClick={() => onDismiss(upload.id)}
                    size="sm"
                    type="button"
                    workspace
                  >
                    Dismiss
                  </WorkspaceButton>
                </>
              ) : null}
            </div>
            {upload.status === "uploading" || upload.status === "finalizing" ? (
              <Progress
                aria-label={`Uploading ${upload.name}`}
                value={uploadPercent(upload)}
              />
            ) : null}
          </li>
        ))}
      </ul>
      {finished ? (
        <WorkspaceButton
          onClick={onClearFinished}
          size="sm"
          type="button"
          workspace
        >
          Clear finished
        </WorkspaceButton>
      ) : null}
    </section>
  );
};

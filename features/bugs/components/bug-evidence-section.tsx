/* eslint-disable shadcn/no-unknown-classes -- Bug views use reference workspace CSS classes. */

"use client";

import { SpinnerGap, UploadSimple } from "@phosphor-icons/react";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  WorkspaceSelect,
  WorkspaceSelectItem,
} from "@/components/workspace/workspace-select";
import { addBugEvidenceAction } from "@/features/bugs/bugs-actions";
import {
  BugEvidenceHistory,
  BugEvidenceResource,
} from "@/features/bugs/components/bug-evidence-history";
import {
  finalizeUploadAction,
  requestTaskUploadAction,
} from "@/features/files/files-actions";

import { formatBugDate } from "../bug-workflow-ui-shared";
import type { BugHistory, BugSubmit } from "../bug-workflow-ui-shared";

// An evidence upload is two writes: finalizing the file, then linking it to
// the bug. When the link is refused, the finalized file is kept so a retry
// links that same file instead of uploading a second copy.
type EvidenceUpload =
  | { readonly status: "idle" }
  | { readonly status: "uploading" }
  | { readonly status: "linking"; readonly file: UnlinkedFile }
  | { readonly status: "unlinked"; readonly file: UnlinkedFile };

interface UnlinkedFile {
  readonly fileAssetId: string;
  readonly fileName: string;
  readonly kind: string;
}

export const BugEvidenceSection = ({
  canEdit,
  history,
  isReadOnly,
  latestAttempt,
  onError,
  onRefresh,
  openFile,
  pending,
  submit,
}: {
  readonly canEdit: boolean;
  readonly history: BugHistory;
  readonly isReadOnly: boolean;
  readonly latestAttempt: BugHistory["attempts"][number] | null;
  readonly onError: (message: string) => void;
  readonly onRefresh?: () => Promise<void>;
  readonly openFile: (fileId: string, preview: boolean) => Promise<void>;
  readonly pending: boolean;
  readonly submit: BugSubmit;
}) => {
  const [evidenceKind, setEvidenceKind] = useState("before");
  const [upload, setUpload] = useState<EvidenceUpload>({ status: "idle" });
  const [fileInputKey, setFileInputKey] = useState(0);
  const fileBusy = upload.status === "uploading" || upload.status === "linking";

  const linkEvidence = async (file: UnlinkedFile) => {
    setUpload({ file, status: "linking" });
    const attached = await addBugEvidenceAction({
      bugId: history.bug.id,
      caption: file.fileName,
      expectedVersion: history.bug.version,
      externalUrl: null,
      fileAssetId: file.fileAssetId,
      fixAttemptId: latestAttempt?.id ?? null,
      kind: file.kind,
    });
    if (attached.ok === false) {
      onError(attached.error.message);
      setUpload({ file, status: "unlinked" });
      // A version conflict needs the current bug before a retry can succeed.
      await onRefresh?.();
      return;
    }
    setUpload({ status: "idle" });
    setFileInputKey((value) => value + 1);
    await onRefresh?.();
  };

  const uploadEvidence = async (file: File | undefined) => {
    if (!file || upload.status !== "idle") {
      return;
    }
    setUpload({ status: "uploading" });
    try {
      const ticket = await requestTaskUploadAction({
        contentType: file.type || "application/octet-stream",
        fileName: file.name,
        sizeBytes: file.size,
        taskId: history.bug.taskId,
      });
      if (ticket.ok === false) {
        onError(ticket.error.message);
        setUpload({ status: "idle" });
        return;
      }
      const response = await fetch(ticket.data.uploadUrl, {
        body: file,
        headers: ticket.data.requiredHeaders,
        method: "PUT",
      });
      if (!response.ok) {
        onError(
          `Upload failed for ${file.name}. Check the storage configuration and try again.`
        );
        setUpload({ status: "idle" });
        return;
      }
      const finalized = await finalizeUploadAction({
        idempotencyKey: crypto.randomUUID(),
        uploadIntentId: ticket.data.uploadIntentId,
      });
      if (finalized.ok === false) {
        onError(finalized.error.message);
        setUpload({ status: "idle" });
        return;
      }
      await linkEvidence({
        fileAssetId: finalized.data.id,
        fileName: file.name,
        kind: evidenceKind,
      });
    } catch {
      onError("Upload failed. Check the storage configuration and try again.");
      setUpload((current) =>
        current.status === "linking"
          ? { file: current.file, status: "unlinked" }
          : { status: "idle" }
      );
    }
  };

  const retryLink = async () => {
    if (upload.status !== "unlinked") {
      return;
    }
    try {
      await linkEvidence(upload.file);
    } catch {
      onError("The file could not be added as evidence. Try again.");
      setUpload({ file: upload.file, status: "unlinked" });
    }
  };

  if (!canEdit || isReadOnly) {
    return (
      <section className="panel panel-b bug-detail-section">
        <h2>Evidence history</h2>
        <BugEvidenceHistory history={history} openFile={openFile} />
      </section>
    );
  }
  const beforeEvidence = history.evidence.filter(
    ({ kind }) => kind === "before"
  );
  const afterEvidence = history.evidence.filter(({ kind }) => kind === "after");
  return (
    <section className="panel panel-b bug-detail-section">
      <h2>Before and after evidence</h2>
      <div className="bug-evidence-columns">
        {[
          { items: beforeEvidence, kind: "before", title: "Before the fix" },
          { items: afterEvidence, kind: "after", title: "After the fix" },
        ].map(({ kind, title, items }) => (
          <div className="bug-evidence-column" key={kind}>
            <h3>{title}</h3>
            {items.map((evidenceEntry) => (
              <article className="bug-evidence-item" key={evidenceEntry.id}>
                <p>{evidenceEntry.caption}</p>
                <small>{formatBugDate(evidenceEntry.createdAt)}</small>
                <BugEvidenceResource
                  externalUrl={evidenceEntry.externalUrl}
                  file={evidenceEntry.file}
                  openFile={openFile}
                />
              </article>
            ))}
          </div>
        ))}
      </div>
      <form
        className="bug-inline-form"
        onSubmit={(event) =>
          submit(event, (formData) =>
            addBugEvidenceAction({
              bugId: history.bug.id,
              caption: String(formData.get("caption") ?? ""),
              expectedVersion: history.bug.version,
              externalUrl: String(formData.get("externalUrl") ?? "") || null,
              fileAssetId: null,
              fixAttemptId: latestAttempt?.id ?? null,
              kind: evidenceKind,
            })
          )
        }
      >
        <div className="bug-form-field">
          <Label htmlFor="bug-evidence-kind">Evidence stage</Label>
          <WorkspaceSelect
            onValueChange={setEvidenceKind}
            value={evidenceKind}
            id="bug-evidence-kind"
          >
            <WorkspaceSelectItem value="before">Before</WorkspaceSelectItem>
            <WorkspaceSelectItem value="after">After</WorkspaceSelectItem>
            <WorkspaceSelectItem value="other">Other</WorkspaceSelectItem>
          </WorkspaceSelect>
        </div>
        <div className="bug-form-field">
          <Label htmlFor="bug-evidence-caption">Caption</Label>
          <Input id="bug-evidence-caption" name="caption" required />
        </div>
        <div className="bug-form-field bug-form-wide">
          <Label htmlFor="bug-evidence-url">Evidence link (HTTPS)</Label>
          <Input id="bug-evidence-url" name="externalUrl" type="url" />
        </div>
        <Button disabled={pending} type="submit">
          Add link
        </Button>
      </form>
      <div className="bug-evidence-upload">
        <Label htmlFor="bug-evidence-file">Upload evidence</Label>
        <Input
          accept="image/*,video/*,application/pdf,text/plain"
          disabled={fileBusy}
          id="bug-evidence-file"
          key={fileInputKey}
          onChange={(event) => uploadEvidence(event.currentTarget.files?.[0])}
          type="file"
        />
        <span className="bug-field-help">
          Private uploads up to 50 MB. The file is attached only after storage
          verification.
        </span>
        {fileBusy ? (
          <SpinnerGap
            aria-label="Uploading evidence"
            className="animate-spin"
            size={18}
          />
        ) : (
          <UploadSimple aria-hidden="true" size={18} />
        )}
        {upload.status === "unlinked" ? (
          <output className="bug-field-help">
            {upload.file.fileName} was uploaded but is not linked as evidence
            yet. It stays in the task files.{" "}
            <Button
              onClick={retryLink}
              size="sm"
              type="button"
              variant="outline"
            >
              Retry linking
            </Button>{" "}
            <Button
              onClick={() => setUpload({ status: "idle" })}
              size="sm"
              type="button"
              variant="ghost"
            >
              Dismiss
            </Button>
          </output>
        ) : null}
      </div>
    </section>
  );
};

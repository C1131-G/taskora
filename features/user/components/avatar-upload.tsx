/* eslint-disable shadcn/no-unknown-classes */

"use client";

import Image from "next/image";
import { useRef, useState } from "react";
import { toast } from "sonner";

import { WorkspaceButton } from "@/components/workspace/workspace-button";
import { WorkspaceInput } from "@/components/workspace/workspace-controls";
import { UploadProgressList } from "@/features/files/components/upload-progress-list";
import {
  finalizeAvatarUploadAction,
  getAvatarDownloadUrlAction,
  requestAvatarUploadAction,
} from "@/features/files/files-actions";
import { useUploadQueue } from "@/features/files/hooks/use-upload-queue";
import type { UploadRunner } from "@/features/files/hooks/use-upload-queue";
import { isUploadActive } from "@/features/files/upload-store";

// Finalizing is the last step; showing the new photo is the queue refresh.
const runner = (file: File): UploadRunner => {
  let uploadIntentId = "";
  return {
    finalize: async () => {
      const finalized = await finalizeAvatarUploadAction({
        idempotencyKey: crypto.randomUUID(),
        uploadIntentId,
      });
      return finalized.ok ? null : finalized.error.message;
    },
    request: async () => {
      const ticket = await requestAvatarUploadAction({
        contentType: file.type,
        sizeBytes: file.size,
      });
      if (!ticket.ok) {
        return { message: ticket.error.message, ok: false };
      }
      ({ uploadIntentId } = ticket.data);
      return {
        ok: true,
        ticket: {
          requiredHeaders: ticket.data.requiredHeaders,
          uploadUrl: ticket.data.uploadUrl,
        },
      };
    },
  };
};

export const AvatarUpload = ({
  userId,
  initialUrl,
}: {
  readonly userId: string;
  readonly initialUrl: string | null;
}) => {
  const [avatarUrl, setAvatarUrl] = useState(initialUrl);
  const uploadInput = useRef<HTMLInputElement>(null);
  // Showing the new photo is a refresh after the finalize committed, so its
  // failure is a refresh error and a retry never uploads the photo again.
  const queue = useUploadQueue(async () => {
    const avatar = await getAvatarDownloadUrlAction({ userId });
    if (!avatar.ok) {
      throw new Error(avatar.error.message);
    }
    setAvatarUrl(avatar.data);
  });
  const pending = queue.uploads.some(isUploadActive);

  const upload = (file: File | undefined) => {
    if (!file) {
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      toast.error("Profile photos must be 5 MB or smaller.");
      return;
    }
    if (!["image/jpeg", "image/png", "image/webp"].includes(file.type)) {
      toast.error("Choose a JPEG, PNG, or WebP image.");
      return;
    }
    queue.start(file, runner);
  };

  return (
    <div className="row avatar-upload">
      {avatarUrl ? (
        <Image
          alt="Your profile photo"
          className="av lg"
          height={48}
          src={avatarUrl}
          unoptimized
          width={48}
        />
      ) : (
        <span aria-hidden="true" className="av lg">
          M
        </span>
      )}
      <WorkspaceButton
        disabled={pending}
        onClick={() => uploadInput.current?.click()}
        size="sm"
        type="button"
        variant="secondary"
        workspace
      >
        {pending ? "Uploading…" : "Change photo"}
      </WorkspaceButton>
      <WorkspaceInput
        accept="image/jpeg,image/png,image/webp"
        aria-label="Choose a profile photo"
        className="sr-only"
        disabled={pending}
        onChange={(event) => {
          upload(event.currentTarget.files?.[0]);
          event.currentTarget.value = "";
        }}
        ref={uploadInput}
        type="file"
      />
      <UploadProgressList
        onCancel={queue.handleCancel}
        onClearFinished={queue.handleClearFinished}
        onDismiss={queue.handleDismiss}
        onRetry={queue.handleRetry}
        uploads={queue.uploads}
      />
    </div>
  );
};

"use client";

import { useCreateStore, useSelector } from "@tanstack/react-store";
import { useEffect, useRef } from "react";

import { createUploadQueue } from "../upload-queue";
import type { UploadEntry, UploadRunner } from "../upload-queue";
import { uploadActions } from "../upload-store";
import { putWithProgress } from "../upload-transport";

export type { UploadRunner, UploadTicket } from "../upload-queue";

// Shared by project files, task attachments and the avatar control: progress,
// cancel and retry live in one TanStack Store per host component.
export const useUploadQueue = (
  onSettled?: (id: string) => void | Promise<void>
) => {
  const store = useCreateStore({ uploads: [] }, uploadActions);
  const entries = useRef(new Map<string, UploadEntry>());
  const mounted = useRef(true);
  const uploads = useSelector(store, (state) => state.uploads);

  useEffect(() => {
    const activeEntries = entries;
    const activeState = mounted;
    mounted.current = true;
    return () => {
      activeState.current = false;
      for (const entry of activeEntries.current.values()) {
        entry.controller.abort();
      }
      activeEntries.current.clear();
    };
  }, []);

  // Built when an event handler runs, never during render, because it reads
  // the refs.
  const queue = () =>
    createUploadQueue({
      entries,
      mounted,
      onSettled,
      put: putWithProgress,
      store,
    });

  return {
    handleCancel: (id: string) => queue().cancel(id),
    handleClearFinished: () => queue().clearFinished(),
    handleDismiss: (id: string) => queue().dismiss(id),
    handleRetry: (id: string) => queue().retry(id),
    start: (file: File, runner: (file: File) => UploadRunner) =>
      queue().start(file, runner),
    uploads,
  };
};

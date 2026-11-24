import { isUploadActive } from "./upload-store";
import type { UploadActions, UploadState } from "./upload-store";
import type { PutResult } from "./upload-transport";

interface UploadTicket {
  readonly uploadUrl: string;
  readonly requiredHeaders: Readonly<Record<string, string>>;
}

// One upload attempt. Returns an error message, or null when it finished.
export interface UploadRunner {
  readonly request: () => Promise<
    | { readonly ok: true; readonly ticket: UploadTicket }
    | { readonly ok: false; readonly message: string }
  >;
  readonly finalize: () => Promise<string | null>;
}

// One run of an upload. A retry replaces the entry, and its controller tells
// the runs apart: a run whose controller is no longer the current entry's has
// been superseded, dismissed or unmounted, and must not write any more.
export interface UploadEntry {
  readonly controller: AbortController;
  readonly file: File;
  readonly runner: (file: File) => UploadRunner;
  // The attempt whose object reached storage. A finalize retry reuses it, so
  // the same upload intent is finalized again instead of uploading a copy.
  readonly attempt?: UploadRunner;
}

const FAILED_MESSAGE = (name: string) =>
  `Upload failed for ${name}. Check the storage configuration and try again.`;

export interface UploadQueueDeps {
  readonly store: {
    readonly state: UploadState;
    readonly actions: UploadActions;
  };
  readonly entries: { readonly current: Map<string, UploadEntry> };
  readonly mounted: { readonly current: boolean };
  readonly onSettled: ((id: string) => void | Promise<void>) | undefined;
  readonly put: (
    url: string,
    headers: Readonly<Record<string, string>>,
    file: File,
    onProgress: (loadedBytes: number) => void,
    signal: AbortSignal
  ) => Promise<PutResult>;
}

// The upload queue's transitions, outside React so they can be tested. Every
// write first checks that its run is still the current one for that upload.
export const createUploadQueue = ({
  store,
  entries,
  mounted,
  onSettled,
  put,
}: UploadQueueDeps) => {
  const isCurrent = (id: string, entry: UploadEntry) =>
    mounted.current && entries.current.get(id)?.controller === entry.controller;

  const settle = async (id: string, entry: UploadEntry, finalized: boolean) => {
    if (!isCurrent(id, entry)) {
      return;
    }
    try {
      await onSettled?.(id);
      if (finalized && isCurrent(id, entry)) {
        store.actions.done(id);
      }
    } catch {
      if (finalized && isCurrent(id, entry)) {
        store.actions.refreshFailed(id);
      }
    }
  };

  // The first finalize failure keeps the attempt for a finalize-only retry.
  // A finalize retry that fails too ends in "error", so the next retry starts
  // over with a new upload instead of finalizing a dead intent forever.
  const finish = async (
    id: string,
    entry: UploadEntry,
    attempt: UploadRunner,
    isRetry: boolean
  ) => {
    const { actions } = store;
    actions.finalizing(id);
    let message: string | null;
    try {
      message = await attempt.finalize();
    } catch {
      message = FAILED_MESSAGE(entry.file.name);
    }
    if (!isCurrent(id, entry)) {
      return;
    }
    if (message === null) {
      await settle(id, entry, true);
      return;
    }
    if (isRetry) {
      actions.failed(id, message);
    } else {
      entries.current.set(id, { ...entry, attempt });
      actions.finalizeFailed(id, message);
    }
    await settle(id, entry, false);
  };

  const run = async (id: string, entry: UploadEntry) => {
    const { actions } = store;
    try {
      const attempt = entry.runner(entry.file);
      const ticket = await attempt.request();
      if (!isCurrent(id, entry)) {
        return;
      }
      if (entry.controller.signal.aborted) {
        actions.cancelled(id);
        return;
      }
      if (!ticket.ok) {
        actions.failed(id, ticket.message);
        await settle(id, entry, false);
        return;
      }
      const result = await put(
        ticket.ticket.uploadUrl,
        ticket.ticket.requiredHeaders,
        entry.file,
        (loaded) => {
          if (isCurrent(id, entry)) {
            actions.progress(id, loaded);
          }
        },
        entry.controller.signal
      );
      if (!isCurrent(id, entry)) {
        return;
      }
      if (result === "aborted" || entry.controller.signal.aborted) {
        actions.cancelled(id);
        return;
      }
      if (result === "failed") {
        actions.failed(id, FAILED_MESSAGE(entry.file.name));
        await settle(id, entry, false);
        return;
      }
      await finish(id, entry, attempt, false);
    } catch {
      if (isCurrent(id, entry)) {
        actions.failed(id, FAILED_MESSAGE(entry.file.name));
        await settle(id, entry, false);
      }
    }
  };

  const start = (file: File, runner: (file: File) => UploadRunner) => {
    const id = crypto.randomUUID();
    const entry: UploadEntry = {
      controller: new AbortController(),
      file,
      runner,
    };
    entries.current.set(id, entry);
    store.actions.add({ id, name: file.name, sizeBytes: file.size });
    return run(id, entry);
  };

  const cancel = (id: string) => {
    if (
      store.state.uploads.find((upload) => upload.id === id)?.status ===
      "uploading"
    ) {
      entries.current.get(id)?.controller.abort();
    }
  };

  // The store changes status synchronously, so a second click before the
  // next render finds an active upload and does nothing.
  const retry = (id: string): Promise<void> => {
    const upload = store.state.uploads.find((item) => item.id === id);
    const previous = entries.current.get(id);
    if (!upload || !previous) {
      return Promise.resolve();
    }
    const entry: UploadEntry = {
      ...previous,
      controller: new AbortController(),
    };
    const restart = () => {
      const fresh: UploadEntry = {
        controller: entry.controller,
        file: entry.file,
        runner: entry.runner,
      };
      entries.current.set(id, fresh);
      store.actions.restart(id);
      return run(id, fresh);
    };
    switch (upload.status) {
      case "refresh-error": {
        entries.current.set(id, entry);
        store.actions.finalizing(id);
        return settle(id, entry, true);
      }
      case "finalize-error": {
        if (previous.attempt) {
          entries.current.set(id, entry);
          return finish(id, entry, previous.attempt, true);
        }
        return restart();
      }
      case "error":
      case "cancelled": {
        return restart();
      }
      case "uploading":
      case "finalizing":
      case "done": {
        return Promise.resolve();
      }
      default: {
        const _exhaustive: never = upload.status;
        return _exhaustive;
      }
    }
  };

  const dismiss = (id: string) => {
    const upload = store.state.uploads.find((item) => item.id === id);
    if (upload && isUploadActive(upload)) {
      return;
    }
    entries.current.get(id)?.controller.abort();
    entries.current.delete(id);
    store.actions.dismiss(id);
  };

  const clearFinished = () => {
    for (const upload of store.state.uploads) {
      if (!isUploadActive(upload)) {
        entries.current.delete(upload.id);
      }
    }
    store.actions.clearFinished();
  };

  return { cancel, clearFinished, dismiss, retry, start };
};

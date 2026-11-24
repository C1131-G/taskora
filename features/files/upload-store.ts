import type { Store } from "@tanstack/store";
import { createStore } from "@tanstack/store";

// "finalize-error" means the object is in storage but finalizing it failed,
// so a retry finalizes the same upload again instead of starting a new one.
export type UploadStatus =
  | "uploading"
  | "finalizing"
  | "done"
  | "refresh-error"
  | "finalize-error"
  | "error"
  | "cancelled";

export interface UploadItem {
  readonly id: string;
  readonly name: string;
  readonly sizeBytes: number;
  readonly loadedBytes: number;
  readonly status: UploadStatus;
  readonly error: string | null;
}

// Client UI state for in-flight uploads. The files themselves and their abort
// controllers stay in the queue hook; this holds only what the list renders.
export interface UploadState {
  readonly uploads: readonly UploadItem[];
}

type UploadStoreSetState = Store<UploadState>["setState"];

// An upload still talking to the server: it cannot be retried or dismissed.
export const isUploadActive = (upload: Pick<UploadItem, "status">): boolean =>
  upload.status === "uploading" || upload.status === "finalizing";

// The statuses each change may start from. Any other status ignores it, so a
// late or repeated event cannot move an upload backwards.
const ALLOWED_FROM = {
  cancelled: ["uploading"],
  done: ["finalizing", "refresh-error"],
  failed: ["uploading", "finalizing"],
  finalizeFailed: ["finalizing"],
  finalizing: ["uploading", "finalize-error", "refresh-error"],
  progress: ["uploading"],
  refreshFailed: ["finalizing"],
  restart: ["error", "cancelled", "finalize-error"],
} as const satisfies Record<string, readonly UploadStatus[]>;

type UploadChange = keyof typeof ALLOWED_FROM;

export const canApply = (change: UploadChange, status: UploadStatus) =>
  ALLOWED_FROM[change].some((allowed) => allowed === status);

const patchItem = (
  state: UploadState,
  id: string,
  change: UploadChange,
  patch: (upload: UploadItem) => Partial<UploadItem>
): UploadState => ({
  uploads: state.uploads.map((upload) =>
    upload.id === id && canApply(change, upload.status)
      ? { ...upload, ...patch(upload) }
      : upload
  ),
});

export const uploadActions = ({
  setState,
}: {
  readonly setState: UploadStoreSetState;
}) => ({
  add: (upload: Pick<UploadItem, "id" | "name" | "sizeBytes">) =>
    setState((previous) => ({
      uploads: [
        ...previous.uploads,
        { ...upload, error: null, loadedBytes: 0, status: "uploading" },
      ],
    })),
  cancelled: (id: string) =>
    setState((previous) =>
      patchItem(previous, id, "cancelled", () => ({ status: "cancelled" }))
    ),
  clearFinished: () =>
    setState((previous) => ({
      uploads: previous.uploads.filter(isUploadActive),
    })),
  dismiss: (id: string) =>
    setState((previous) => ({
      uploads: previous.uploads.filter((upload) => upload.id !== id),
    })),
  done: (id: string) =>
    setState((previous) =>
      patchItem(previous, id, "done", (upload) => ({
        error: null,
        loadedBytes: upload.sizeBytes,
        status: "done",
      }))
    ),
  failed: (id: string, error: string) =>
    setState((previous) =>
      patchItem(previous, id, "failed", () => ({ error, status: "error" }))
    ),
  finalizeFailed: (id: string, error: string) =>
    setState((previous) =>
      patchItem(previous, id, "finalizeFailed", () => ({
        error,
        status: "finalize-error",
      }))
    ),
  finalizing: (id: string) =>
    setState((previous) =>
      patchItem(previous, id, "finalizing", () => ({
        error: null,
        status: "finalizing",
      }))
    ),
  progress: (id: string, loadedBytes: number) =>
    setState((previous) =>
      patchItem(previous, id, "progress", () => ({ loadedBytes }))
    ),
  refreshFailed: (id: string) =>
    setState((previous) =>
      patchItem(previous, id, "refreshFailed", () => ({
        error: "Upload finished, but the file list could not refresh.",
        status: "refresh-error",
      }))
    ),
  restart: (id: string) =>
    setState((previous) =>
      patchItem(previous, id, "restart", () => ({
        error: null,
        loadedBytes: 0,
        status: "uploading",
      }))
    ),
});

export type UploadActions = ReturnType<typeof uploadActions>;

export const createUploadStore = () =>
  createStore<UploadState, UploadActions>({ uploads: [] }, uploadActions);

export const uploadPercent = (upload: UploadItem): number =>
  upload.sizeBytes <= 0
    ? 0
    : Math.min(100, Math.round((upload.loadedBytes / upload.sizeBytes) * 100));

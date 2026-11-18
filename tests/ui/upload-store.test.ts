import { expect, test } from "bun:test";

import {
  canApply,
  createUploadStore,
  isUploadActive,
  uploadPercent,
} from "../../features/files/upload-store";
import type { UploadStatus } from "../../features/files/upload-store";

const sampleUpload = { id: "a", name: "plan.pdf", sizeBytes: 200 };

test("an added upload starts at zero and reports progress as a percent", () => {
  const store = createUploadStore();
  store.actions.add(sampleUpload);
  expect(store.state.uploads[0]?.status).toBe("uploading");
  store.actions.progress("a", 50);
  const [first] = store.state.uploads;
  expect(first && uploadPercent(first)).toBe(25);
});

test("done fills the bar and failed keeps the message for a retry", () => {
  const store = createUploadStore();
  store.actions.add(sampleUpload);
  store.actions.failed("a", "Storage is unreachable");
  expect(store.state.uploads[0]).toMatchObject({
    error: "Storage is unreachable",
    status: "error",
  });
  store.actions.restart("a");
  expect(store.state.uploads[0]).toMatchObject({
    error: null,
    loadedBytes: 0,
    status: "uploading",
  });
  store.actions.finalizing("a");
  store.actions.done("a");
  const [first] = store.state.uploads;
  expect(first?.status).toBe("done");
  expect(first && uploadPercent(first)).toBe(100);
});

test("cancelled uploads stay listed until dismissed, and clearFinished keeps running ones", () => {
  const store = createUploadStore();
  store.actions.add(sampleUpload);
  store.actions.add({ id: "b", name: "photo.png", sizeBytes: 10 });
  store.actions.cancelled("a");
  expect(store.state.uploads[0]?.status).toBe("cancelled");
  store.actions.clearFinished();
  expect(store.state.uploads.map(({ id }) => id)).toEqual(["b"]);
  store.actions.dismiss("b");
  expect(store.state.uploads).toEqual([]);
});

test("finalizing uploads survive Clear finished and cannot be treated as failed transfers", () => {
  const store = createUploadStore();
  store.actions.add({ id: "one", name: "one.txt", sizeBytes: 10 });
  store.actions.finalizing("one");
  store.actions.clearFinished();
  expect(store.state.uploads[0]?.status).toBe("finalizing");
  store.actions.refreshFailed("one");
  expect(store.state.uploads[0]?.status).toBe("refresh-error");
  store.actions.done("one");
  expect(store.state.uploads[0]).toMatchObject({ error: null, status: "done" });
});

test("a zero-byte file reports 0 percent instead of dividing by zero", () => {
  const store = createUploadStore();
  store.actions.add({ id: "z", name: "empty.txt", sizeBytes: 0 });
  const [first] = store.state.uploads;
  expect(first && uploadPercent(first)).toBe(0);
});

test("a finalize failure keeps the upload for a finalize-only retry, and a second failure asks for a new upload", () => {
  const store = createUploadStore();
  store.actions.add(sampleUpload);
  store.actions.finalizing("a");
  store.actions.finalizeFailed("a", "The server did not answer");
  expect(store.state.uploads[0]).toMatchObject({
    error: "The server did not answer",
    status: "finalize-error",
  });
  store.actions.finalizing("a");
  expect(store.state.uploads[0]).toMatchObject({
    error: null,
    status: "finalizing",
  });
  store.actions.failed("a", "The upload request expired");
  expect(store.state.uploads[0]?.status).toBe("error");
  store.actions.restart("a");
  expect(store.state.uploads[0]?.status).toBe("uploading");
});

test("late or repeated events cannot move an upload out of its state", () => {
  const store = createUploadStore();
  store.actions.add(sampleUpload);
  store.actions.finalizing("a");
  store.actions.done("a");
  store.actions.restart("a");
  store.actions.progress("a", 10);
  store.actions.cancelled("a");
  store.actions.failed("a", "stale failure");
  expect(store.state.uploads[0]).toMatchObject({
    error: null,
    loadedBytes: 200,
    status: "done",
  });
  store.actions.add({ id: "b", name: "b.txt", sizeBytes: 10 });
  store.actions.restart("b");
  store.actions.done("b");
  expect(store.state.uploads[1]?.status).toBe("uploading");
});

test("only error, cancelled and finalize-error can restart, and only uploading and finalizing are active", () => {
  const statuses: readonly UploadStatus[] = [
    "uploading",
    "finalizing",
    "done",
    "refresh-error",
    "finalize-error",
    "error",
    "cancelled",
  ];
  expect(statuses.filter((status) => canApply("restart", status))).toEqual([
    "finalize-error",
    "error",
    "cancelled",
  ]);
  expect(statuses.filter((status) => isUploadActive({ status }))).toEqual([
    "uploading",
    "finalizing",
  ]);
});

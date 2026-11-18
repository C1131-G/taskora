import { expect, test } from "bun:test";

import { createUploadQueue } from "../../features/files/upload-queue";
import type {
  UploadEntry,
  UploadRunner,
} from "../../features/files/upload-queue";
import { createUploadStore } from "../../features/files/upload-store";
import type { PutResult } from "../../features/files/upload-transport";

interface Calls {
  requests: number;
  finalizes: number;
  puts: number;
}

const setup = ({
  finalizeResults = [null],
  putResult = "ok",
  onSettled,
}: {
  readonly finalizeResults?: readonly (string | null)[];
  readonly putResult?: PutResult;
  readonly onSettled?: (id: string) => Promise<void>;
} = {}) => {
  const store = createUploadStore();
  const entries = { current: new Map<string, UploadEntry>() };
  const mounted = { current: true };
  const calls: Calls = { finalizes: 0, puts: 0, requests: 0 };
  const runners: UploadRunner[] = [];
  const runner = (): UploadRunner => {
    const attempt: UploadRunner = {
      finalize: () => {
        const result = finalizeResults[calls.finalizes] ?? null;
        calls.finalizes += 1;
        return Promise.resolve(result);
      },
      request: () => {
        calls.requests += 1;
        return Promise.resolve({
          ok: true,
          ticket: { requiredHeaders: {}, uploadUrl: "https://upload.example" },
        });
      },
    };
    runners.push(attempt);
    return attempt;
  };
  const queue = createUploadQueue({
    entries,
    mounted,
    onSettled,
    put: () => {
      calls.puts += 1;
      return Promise.resolve(putResult);
    },
    store,
  });
  const file = new File(["hello"], "notes.txt", { type: "text/plain" });
  const status = () => store.state.uploads[0]?.status;
  const id = () => store.state.uploads[0]?.id ?? "";
  return { calls, file, id, mounted, queue, runner, runners, status, store };
};

test("a retry after a lost finalize response finalizes the same upload again instead of uploading a copy", async () => {
  const harness = setup({ finalizeResults: ["Network error", null] });
  await harness.queue.start(harness.file, harness.runner);
  expect(harness.status()).toBe("finalize-error");

  await harness.queue.retry(harness.id());

  expect(harness.status()).toBe("done");
  expect(harness.calls).toEqual({ finalizes: 2, puts: 1, requests: 1 });
  expect(harness.runners).toHaveLength(1);
});

test("a finalize retry that fails too ends in error, and the next retry starts a new upload", async () => {
  const harness = setup({
    finalizeResults: ["Network error", "The upload request expired.", null],
  });
  await harness.queue.start(harness.file, harness.runner);
  await harness.queue.retry(harness.id());
  expect(harness.status()).toBe("error");

  await harness.queue.retry(harness.id());

  expect(harness.status()).toBe("done");
  expect(harness.calls).toEqual({ finalizes: 3, puts: 2, requests: 2 });
});

test("a double-clicked retry starts only one new run", async () => {
  const harness = setup({ putResult: "failed" });
  await harness.queue.start(harness.file, harness.runner);
  expect(harness.status()).toBe("error");

  await Promise.all([
    harness.queue.retry(harness.id()),
    harness.queue.retry(harness.id()),
  ]);

  expect(harness.calls.requests).toBe(2);
  expect(harness.calls.puts).toBe(2);
});

test("retry does nothing for an upload that is done", async () => {
  const harness = setup();
  await harness.queue.start(harness.file, harness.runner);
  expect(harness.status()).toBe("done");

  await harness.queue.retry(harness.id());

  expect(harness.calls).toEqual({ finalizes: 1, puts: 1, requests: 1 });
});

test("a run that resolves after unmount writes nothing", async () => {
  const harness = setup();
  const running = harness.queue.start(harness.file, harness.runner);
  harness.mounted.current = false;
  await running;

  expect(harness.status()).toBe("uploading");
  expect(harness.calls.puts).toBe(0);
});

test("a refresh retry only refreshes the list", async () => {
  let refreshes = 0;
  const harness = setup({
    onSettled: () => {
      refreshes += 1;
      return refreshes === 1
        ? Promise.reject(new Error("offline"))
        : Promise.resolve();
    },
  });
  await harness.queue.start(harness.file, harness.runner);
  expect(harness.status()).toBe("refresh-error");

  await harness.queue.retry(harness.id());

  expect(harness.status()).toBe("done");
  expect(harness.calls).toEqual({ finalizes: 1, puts: 1, requests: 1 });
});

test("dismiss ignores an active upload", async () => {
  const harness = setup();
  const running = harness.queue.start(harness.file, harness.runner);
  harness.queue.dismiss(harness.id());
  expect(harness.store.state.uploads).toHaveLength(1);
  await running;
  expect(harness.status()).toBe("done");
});

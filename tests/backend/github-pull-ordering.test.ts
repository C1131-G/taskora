import { afterAll, beforeAll, expect, it } from "bun:test";
import { randomUUID } from "node:crypto";

import { Effect } from "effect";

import {
  GithubConnections,
  GithubConnectionsLive,
} from "../../src/server/github/github-connections";
import {
  GithubIngest,
  GithubIngestLive,
} from "../../src/server/github/github-ingest";
import { signGithubBody } from "../../src/server/github/github-signature";
import {
  authPool,
  ids,
  personaId,
  setupHarness,
  teardownHarness,
} from "./support/action-harness";

process.env["BETTER_AUTH_SECRET"] ??=
  "test-only-secret-that-is-at-least-thirty-two-characters";

interface Connection {
  readonly repo: string;
  readonly secret: string;
}

const connect = async (projectId: string): Promise<Connection> => {
  const repo = `acme/o-${randomUUID().slice(0, 8)}`;
  const created = await Effect.runPromise(
    Effect.provide(
      Effect.gen(function* use() {
        const service = yield* GithubConnections;
        return yield* service.create(personaId("admin"), {
          autoCompleteOnMerge: true,
          projectId,
          repoFullName: repo,
        });
      }),
      GithubConnectionsLive
    )
  );
  return { repo, secret: created.secret };
};

let projectKey = "";
let archivedProjectId = "";
let archivedKey = "";
let auto: Connection;
let archived: Connection;
let nextNumber = 500;

const insertTask = async (projectId: string) => {
  nextNumber += 1;
  const id = randomUUID();
  await authPool.query(
    'INSERT INTO task (id, "projectId", "projectTaskNumber", title, "createdById") VALUES ($1, $2, $3, $4, $5)',
    [id, projectId, nextNumber, `Ordering ${nextNumber}`, personaId("owner")]
  );
  return { id, number: nextNumber };
};

beforeAll(async () => {
  await setupHarness();
  const project = await authPool.query<{ key: string }>(
    "SELECT key FROM project WHERE id = $1",
    [ids.projectId]
  );
  projectKey = project.rows[0]?.key ?? "";
  archivedProjectId = randomUUID();
  archivedKey = `PA${archivedProjectId.replaceAll("-", "").slice(0, 5).toUpperCase()}`;
  await authPool.query(
    "INSERT INTO project (id, key, name) VALUES ($1, $2, 'Archived mapped project')",
    [archivedProjectId, archivedKey]
  );
  auto = await connect(ids.projectId);
  archived = await connect(archivedProjectId);
  await authPool.query(
    'UPDATE project SET "archivedAt" = now() WHERE id = $1',
    [archivedProjectId]
  );
});

afterAll(async () => {
  await authPool.query(
    'DELETE FROM github_connection WHERE "createdById" = $1',
    [personaId("admin")]
  );
  await authPool.query('DELETE FROM task WHERE "projectId" = $1', [
    archivedProjectId,
  ]);
  await authPool.query("DELETE FROM project WHERE id = $1", [
    archivedProjectId,
  ]);
  await teardownHarness();
});

const deliver = (
  connection: Connection,
  pull: { action: string; number: number; title: string; merged: boolean }
) => {
  const body = new TextEncoder().encode(
    JSON.stringify({
      action: pull.action,
      number: pull.number,
      pull_request: {
        body: null,
        head: { ref: "feature/x" },
        html_url: "https://example.invalid/not-used",
        merged: pull.merged,
        number: pull.number,
        title: pull.title,
        user: { login: "octocat" },
      },
      repository: { full_name: connection.repo },
    })
  );
  return Effect.runPromise(
    Effect.provide(
      Effect.gen(function* receive() {
        const ingest = yield* GithubIngest;
        return yield* ingest.receive({
          deliveryId: randomUUID(),
          event: "pull_request",
          rawBody: body,
          signature: signGithubBody(connection.secret, body),
        });
      }),
      GithubIngestLive
    )
  );
};

const linkOf = async (taskId: string) => {
  const rows = await authPool.query<{
    state: string;
    title: string;
    mergedAt: Date | null;
  }>(
    'SELECT state, title, "mergedAt" FROM github_pull_link WHERE "taskId" = $1',
    [taskId]
  );
  return rows.rows;
};

const taskStatus = async (taskId: string) => {
  const rows = await authPool.query<{ status: string }>(
    "SELECT status FROM task WHERE id = $1",
    [taskId]
  );
  return rows.rows[0]?.status;
};

it("keeps a merged pull link merged when an older event arrives late", async () => {
  const task = await insertTask(ids.projectId);
  const title = `${projectKey}-${task.number} change`;
  const merged = await deliver(auto, {
    action: "closed",
    merged: true,
    number: 41,
    title,
  });
  expect(merged).toMatchObject({ completed: 1, status: "processed" });
  // A user reopens the task, then a stale "edited" from before the merge lands.
  await authPool.query(
    "UPDATE task SET status = 'todo', \"completedAt\" = NULL, version = version + 1 WHERE id = $1",
    [task.id]
  );
  const late = await deliver(auto, {
    action: "edited",
    merged: false,
    number: 41,
    title: `${title} renamed`,
  });
  expect(late).toMatchObject({ completed: 0, status: "processed" });
  const [link] = await linkOf(task.id);
  expect(link).toMatchObject({ state: "merged", title: `${title} renamed` });
  expect(link?.mergedAt).not.toBeNull();
  // The next event for the merged PR is not a first merge again.
  const again = await deliver(auto, {
    action: "edited",
    merged: true,
    number: 41,
    title,
  });
  expect(again).toMatchObject({ completed: 0, status: "processed" });
  expect(await taskStatus(task.id)).toBe("todo");
});

it("processes concurrent deliveries for the same new pull request without dropping one", async () => {
  const task = await insertTask(ids.projectId);
  const title = `${projectKey}-${task.number} change`;
  const outcomes = await Promise.all(
    Array.from({ length: 6 }, (_, index) =>
      deliver(auto, {
        action: index === 5 ? "closed" : "edited",
        merged: index === 5,
        number: 42,
        title,
      })
    )
  );
  expect(outcomes.map((outcome) => outcome.status)).toEqual(
    Array.from({ length: 6 }, () => "processed")
  );
  expect(await taskStatus(task.id)).toBe("done");
  expect(await linkOf(task.id)).toHaveLength(1);
});

it("does not link or complete tasks in an archived project", async () => {
  const task = await insertTask(archivedProjectId);
  const outcome = await deliver(archived, {
    action: "closed",
    merged: true,
    number: 43,
    title: `${archivedKey}-${task.number} change`,
  });
  expect(outcome).toMatchObject({
    completed: 0,
    linked: 0,
    status: "processed",
  });
  expect(await taskStatus(task.id)).toBe("todo");
  expect(await linkOf(task.id)).toEqual([]);
});

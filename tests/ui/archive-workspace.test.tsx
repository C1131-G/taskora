import { expect, mock, test } from "bun:test";

import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";

// The real actions reach server-only code; rendering needs only their names.
mock.module("@/features/tasks/tasks-actions", () => ({
  restoreTaskAction: () => Promise.resolve({ ok: true }),
}));
mock.module("@/features/projects/projects-actions", () => ({
  restoreProjectAction: () => Promise.resolve({ ok: true }),
}));

const { ArchiveWorkspace } =
  await import("@/features/archive/components/archive-workspace");

const task = (id: string, projectArchived: boolean) => ({
  archivedAt: null,
  id,
  projectArchived,
  projectName: "Website relaunch",
  title: `Task ${id}`,
  version: 2,
});

// The server refuses to restore a task while its project is archived, so the
// page offers Restore only for tasks whose project is live.
test("offers Restore only for archived tasks of a live project", () => {
  const markup = renderToStaticMarkup(
    createElement(ArchiveWorkspace, {
      canRestore: true,
      projects: [],
      tasks: [task("live", false), task("frozen", true)],
    })
  );

  expect(markup.match(/>Restore</gu)?.length).toBe(1);
  expect(markup).toContain("Restore the project to restore this task");
});

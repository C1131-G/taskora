import { screen, userEvent, waitFor } from "@testing-library/react-native";
import { Effect } from "effect";

import { ValidationFailed } from "@/errors";
import {
  filterTasks,
  MyTasksScreen,
  TaskDetailScreen,
  type TaskRowModel,
} from "@/features/tasks/task-screens";
import type { ApiContextValue, KeysContextValue } from "@/runtime/api-hooks";
import { HapticsContext } from "@/runtime/haptics-hooks";
import { renderWithTheme } from "../components/support/theme";

const TASKS: readonly TaskRowModel[] = [
  {
    dueAt: "2026-11-02T00:00:00.000Z",
    id: "task-1",
    priority: "high",
    projectName: "Website relaunch",
    status: "progress",
    title: "Ship the landing page",
  },
  {
    dueAt: null,
    id: "task-2",
    priority: "medium",
    projectName: "Website relaunch",
    status: "todo",
    title: "Draft the announcement",
  },
  {
    dueAt: null,
    id: "task-3",
    priority: "low",
    projectName: "Client portal",
    status: "done",
    title: "Set up staging",
  },
];

it("filters the task list by status", () => {
  expect(filterTasks(TASKS, "all").length).toBe(3);
  expect(filterTasks(TASKS, "todo").map((task) => task.id)).toEqual(["task-2"]);
  expect(filterTasks(TASKS, "progress")[0]?.title).toBe("Ship the landing page");
});

it("renders the rows and opens a task", async () => {
  let opened: string | null = null;
  const user = userEvent.setup();
  await renderWithTheme(
    <MyTasksScreen isLoading={false}
      onOpenTask={(id) => {
        opened = id;
      }}
      tasks={TASKS}
    />,
  );

  expect(screen.getByText("3 of 3 tasks")).toBeTruthy();

  await user.press(screen.getByRole("button", { name: "Open task Ship the landing page" }));

  expect(opened).toBe("task-1");
});

it("filters the visible rows through the chips", async () => {
  const user = userEvent.setup();
  await renderWithTheme(<MyTasksScreen isLoading={false} onOpenTask={() => undefined} tasks={TASKS} />);

  await user.press(screen.getByRole("button", { name: "Done" }));

  expect(screen.getByText("1 of 3 tasks")).toBeTruthy();
  expect(screen.queryByText("Open task Ship the landing page")).toBeNull();
});


it("offers a backlog chip with every status label", async () => {
  const backlog: TaskRowModel = {
    dueAt: null,
    id: "task-4",
    priority: "low",
    projectName: "Website relaunch",
    status: "backlog",
    title: "Someday",
  };
  const user = userEvent.setup();
  await renderWithTheme(
    <MyTasksScreen isLoading={false} onOpenTask={() => undefined} tasks={[...TASKS, backlog]} />,
  );

  for (const label of ["All", "Backlog", "To Do", "In Progress", "Review", "Done"]) {
    expect(screen.getByRole("button", { name: label })).toBeTruthy();
  }
  await user.press(screen.getByRole("button", { name: "Backlog" }));

  expect(screen.getByText("1 of 4 tasks")).toBeTruthy();
});

const keysStub: KeysContextValue = {
  forget: () => Effect.void,
  run: (_intent, program) => program("key-1234567890"),
};

const SUBTASKS = [
  { completed: true, id: "sub-1", title: "Hero art" },
  { completed: false, id: "sub-2", title: "Launch checklist" },
];

const detail = (overrides: Partial<Parameters<typeof TaskDetailScreen>[0]["task"]> = {}) => ({
  projectName: "Website relaunch",
  status: "progress" as const,
  subtasks: SUBTASKS,
  title: "Ship the landing page",
  version: 3,
  ...overrides,
});

const apiWith = (client: Record<string, unknown>) =>
  ({
    call: (run: (client: unknown) => Promise<unknown>) =>
      Effect.tryPromise({
        catch: () => new ValidationFailed({ fieldErrors: {} }),
        try: () => run(client),
      }),
  }) as unknown as ApiContextValue;

it("shows the task's subtasks and toggles one", async () => {
  const toggled: boolean[] = [];
  const api = apiWith({
    setSubtaskStatus: (input: { readonly body: { readonly done: boolean } }) => {
      toggled.push(input.body.done);
      return Promise.resolve({ done: input.body.done, version: 4 });
    },
  });

  await renderWithTheme(
    <TaskDetailScreen isLoading={false} api={api} keys={keysStub} task={detail()} taskId="task-1" />,
  );

  expect(screen.getByText("Hero art")).toBeTruthy();
  const user = userEvent.setup();
  await user.press(screen.getByRole("button", { name: "Toggle subtask Launch checklist" }));

  await waitFor(() => expect(toggled).toEqual([true]));
});

it("moves the status with the version the screen last saw", async () => {
  const sent: unknown[] = [];
  const api = apiWith({
    changeTask: (input: unknown) => {
      sent.push(input);
      return Promise.resolve({ status: "done", version: 4 });
    },
  });

  await renderWithTheme(
    <TaskDetailScreen isLoading={false} api={api} keys={keysStub} task={detail()} taskId="task-1" />,
  );
  const user = userEvent.setup();
  await user.press(screen.getByRole("button", { name: "Change status" }));
  await user.press(screen.getByRole("radio", { name: "Done" }));

  await waitFor(() => expect(sent.length).toBe(1));
  expect(sent[0]).toMatchObject({
    body: { expectedVersion: 3, status: "done" },
    idempotencyKey: "key-1234567890",
    params: { taskId: "task-1" },
  });
});

it("tells the user when a status move fails", async () => {
  const api = {
    call: () => Effect.fail(new ValidationFailed({ fieldErrors: { status: "Cannot move this task" } })),
  } as unknown as ApiContextValue;

  await renderWithTheme(
    <TaskDetailScreen isLoading={false} api={api} keys={keysStub} task={detail()} taskId="task-1" />,
  );
  const user = userEvent.setup();
  await user.press(screen.getByRole("button", { name: "Change status" }));
  await user.press(screen.getByRole("radio", { name: "Done" }));

  await waitFor(() => expect(screen.getByRole("alert")).toBeTruthy());
  expect(screen.getByText("Cannot move this task")).toBeTruthy();
});

it("shows a toast again when a task update fails after dismissal", async () => {
  const api = {
    call: () => Effect.fail(new ValidationFailed({ fieldErrors: { task: "Cannot update this task" } })),
  } as unknown as ApiContextValue;
  const user = userEvent.setup();
  await renderWithTheme(<TaskDetailScreen isLoading={false} api={api} keys={keysStub} task={detail()} taskId="task-1" />);

  await user.press(screen.getByRole("button", { name: "Toggle subtask Launch checklist" }));
  await waitFor(() => expect(screen.getByText("Cannot update this task")).toBeTruthy());
  await user.press(screen.getByRole("button", { name: "Dismiss" }));
  await user.press(screen.getByRole("button", { name: "Toggle subtask Launch checklist" }));
  await waitFor(() => expect(screen.getByText("Cannot update this task")).toBeTruthy());
});

it("shows a toggled subtask at once and restores it when the write fails", async () => {
  let reject: (reason: unknown) => void = () => undefined;
  const api = apiWith({
    setSubtaskStatus: () =>
      new Promise((_resolve, rejectWrite) => {
        reject = rejectWrite;
      }),
  });
  const user = userEvent.setup();
  await renderWithTheme(<TaskDetailScreen isLoading={false} api={api} keys={keysStub} task={detail()} taskId="task-1" />);

  expect(screen.queryAllByText("Done")).toHaveLength(1);
  await user.press(screen.getByRole("button", { name: "Toggle subtask Launch checklist" }));
  expect(screen.queryAllByText("Done")).toHaveLength(2);

  reject(new Error("refused"));
  await waitFor(() => expect(screen.getByRole("alert")).toBeTruthy());
  expect(screen.queryAllByText("Done")).toHaveLength(1);
});

it("ignores a second subtask tap while the first write is pending", async () => {
  const sent: boolean[] = [];
  let resolve: (value: unknown) => void = () => undefined;
  const api = apiWith({
    setSubtaskStatus: (input: { readonly body: { readonly done: boolean } }) => {
      sent.push(input.body.done);
      return new Promise((resolveWrite) => {
        resolve = resolveWrite;
      });
    },
  });
  const user = userEvent.setup();
  await renderWithTheme(<TaskDetailScreen isLoading={false} api={api} keys={keysStub} task={detail()} taskId="task-1" />);

  const row = screen.getByRole("button", { name: "Toggle subtask Launch checklist" });
  await user.press(row);
  await user.press(row);

  expect(sent).toEqual([true]);
  expect(screen.queryAllByText("Done")).toHaveLength(2);

  resolve({ done: true, version: 4 });
  await waitFor(() => expect(screen.queryAllByText("Done")).toHaveLength(1));
  expect(sent).toEqual([true]);
});

it("buzzes once per accepted move and ignores repeats and the current status", async () => {
  const sent: unknown[] = [];
  const events: string[] = [];
  const record = (event: string) => Effect.sync(() => void events.push(event));
  const haptics = {
    light: record("light"),
    medium: record("medium"),
    success: record("success"),
    warning: record("warning"),
    error: record("error"),
  };
  const api = apiWith({
    changeTask: (input: unknown) => {
      sent.push(input);
      return new Promise(() => undefined);
    },
  });
  const user = userEvent.setup();
  await renderWithTheme(
    <HapticsContext.Provider value={haptics}>
      <TaskDetailScreen isLoading={false} api={api} keys={keysStub} task={detail()} taskId="task-1" />
    </HapticsContext.Provider>,
  );

  await user.press(screen.getByRole("button", { name: "Change status" }));
  await user.press(screen.getByRole("radio", { name: "In Progress" }));
  expect(sent).toHaveLength(0);
  expect(events).toEqual([]);

  await user.press(screen.getByRole("button", { name: "Change status" }));
  await user.press(screen.getByRole("radio", { name: "Done" }));
  await user.press(screen.getByRole("button", { name: "Change status" }));
  await user.press(screen.getByRole("radio", { name: "Review" }));

  await waitFor(() => expect(sent).toHaveLength(1));
  expect(events).toEqual(["light"]);
  expect(screen.getByText("Status: Done")).toBeTruthy();
});

it("shows a moved status at once while the write is pending", async () => {
  const api = apiWith({ changeTask: () => new Promise(() => undefined) });
  const user = userEvent.setup();
  await renderWithTheme(<TaskDetailScreen isLoading={false} api={api} keys={keysStub} task={detail()} taskId="task-1" />);

  await user.press(screen.getByRole("button", { name: "Change status" }));
  await user.press(screen.getByRole("radio", { name: "Done" }));

  expect(screen.getByText("Status: Done")).toBeTruthy();
});

it("marks a backlog task's status as current and labels it", async () => {
  await renderWithTheme(
    <TaskDetailScreen
      isLoading={false}
      api={apiWith({})}
      keys={keysStub}
      task={detail({ status: "backlog" })}
      taskId="task-1"
    />,
  );
  const user = userEvent.setup();
  expect(screen.getByText("Status: Backlog")).toBeTruthy();
  await user.press(screen.getByRole("button", { name: "Change status" }));

  expect(screen.getByRole("radio", { name: "Backlog" }).props.accessibilityState).toMatchObject({
    checked: true,
  });
  expect(screen.getByRole("radio", { name: "Done" }).props.accessibilityState).toMatchObject({
    checked: false,
  });
});

import { act, fireEvent, screen, waitFor } from "@testing-library/react-native";
import { Effect } from "effect";

import { InboxScreen } from "@/features/inbox/inbox-screen";
import { flattenInboxPages, listInbox, type InboxItem } from "@/features/inbox/queries";
import { Unavailable } from "@/errors";
import { useApiInfiniteQuery, type ApiContextValue, type KeysContextValue } from "@/runtime/api-hooks";
import { inboxKeys } from "@/runtime/query-keys";
import { renderWithTheme } from "../components/support/theme";

const item = (id: string, text: string): InboxItem => ({
  actorId: null,
  actorName: null,
  createdAt: "2026-10-24T09:15:00.000Z",
  id,
  projectId: null,
  projectName: null,
  readAt: null,
  snippet: null,
  taskId: null,
  text,
  type: "update",
});

const keysStub: KeysContextValue = {
  forget: () => Effect.void,
  run: (_intent, program) => program("key-1234567890"),
};

interface Query {
  readonly cursor?: string;
}

const apiWith = (
  list: (query: Query) => Promise<unknown>,
  calls: Query[] = [],
): ApiContextValue =>
  ({
    call: (run: (client: unknown) => Promise<unknown>) =>
      Effect.tryPromise({
        catch: () => new Unavailable({ requestId: "" }),
        try: () =>
          run({
            listWorkspaceNotifications: (input: { readonly query: Query }) => {
              calls.push(input.query);
              return list(input.query);
            },
          }),
      }),
  }) as unknown as ApiContextValue;

const Harness = ({ api }: { readonly api: ApiContextValue }) => {
  const inbox = useApiInfiniteQuery({
    program: (cursor) => listInbox(api, { cursor }),
    queryKey: inboxKeys.list(),
  });
  return (
    <InboxScreen
      api={api}
      failure={inbox.data === undefined ? inbox.error : null}
      hasNextPage={inbox.hasNextPage}
      isFetchingNextPage={inbox.isFetchingNextPage}
      isLoading={inbox.isPending}
      items={inbox.data === undefined ? [] : flattenInboxPages(inbox.data.pages)}
      keys={keysStub}
      onLoadMore={() => void inbox.fetchNextPage()}
      onOpenTask={() => undefined}
      onRetry={() => void inbox.refetch()}
    />
  );
};

/** Fires the list's onEndReached; Jest's ScrollView mock exposes it on the host scroll view. */
const reachEnd = (): void => {
  let node = screen.getByText("First note").parent;
  while (node != null && node.type !== "RCTScrollView") node = node.parent;
  if (node != null) fireEvent(node, "endReached");
};

const page = (items: readonly InboxItem[], nextCursor: string | null) => ({
  items,
  nextCursor,
  unreadCount: items.length,
  unreadInboxCount: items.length,
});

it("loads the next page at the end of the list and appends its items", async () => {
  const calls: Query[] = [];
  const api = apiWith(
    (query) =>
      Promise.resolve(
        query.cursor === undefined
          ? page([item("n1", "First note")], "c1")
          : // n1 repeats across the page boundary and must not show twice.
            page([item("n1", "First note"), item("n2", "Second note")], null),
      ),
    calls,
  );
  await renderWithTheme(<Harness api={api} />);

  await waitFor(() => expect(screen.getByText("First note")).toBeTruthy());
  expect(screen.queryByText("Second note")).toBeNull();

  await act(async () => {
    reachEnd();
  });

  await waitFor(() => expect(screen.getByText("Second note")).toBeTruthy());
  expect(calls.map((query) => query.cursor)).toEqual([undefined, "c1"]);
  expect(screen.getAllByText("First note")).toHaveLength(1);
  expect(screen.getByText("All 2")).toBeTruthy();

  // No further page: reaching the end again does not fetch.
  await act(async () => {
    reachEnd();
  });
  expect(calls).toHaveLength(2);
});

it("shows the empty state when the inbox has no items", async () => {
  await renderWithTheme(<Harness api={apiWith(() => Promise.resolve(page([], null)))} />);

  await waitFor(() => expect(screen.getByText("Inbox zero")).toBeTruthy());
});

it("shows the error state with a retry when the first page fails", async () => {
  await renderWithTheme(<Harness api={apiWith(() => Promise.reject(new Error("offline")))} />);

  await waitFor(() => expect(screen.getByRole("button", { name: /retry|try again/i })).toBeTruthy());
});

it("offers to load older items when the Unread tab is empty but more pages exist", async () => {
  const calls: Query[] = [];
  const read = (id: string, text: string): InboxItem => ({ ...item(id, text), readAt: "2026-10-24T10:00:00.000Z" });
  const api = apiWith(
    (query) =>
      Promise.resolve(
        query.cursor === undefined
          ? page([read("n1", "Old read note")], "c1")
          : page([item("n2", "Unread older note")], null),
      ),
    calls,
  );
  await renderWithTheme(<Harness api={api} />);
  await waitFor(() => expect(screen.getByText("Old read note")).toBeTruthy());

  await act(async () => {
    fireEvent.press(screen.getByRole("tab", { name: /^Unread/ }));
  });
  await waitFor(() => expect(screen.getByText("Nothing unread yet")).toBeTruthy());

  await act(async () => {
    fireEvent.press(screen.getByRole("button", { name: "Load older" }));
  });

  await waitFor(() => expect(screen.getByText("Unread older note")).toBeTruthy());
  expect(calls.map((query) => query.cursor)).toEqual([undefined, "c1"]);
});

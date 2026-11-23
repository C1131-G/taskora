import { fireEvent, screen, waitFor } from "@testing-library/react-native";
import { useQueryClient } from "@tanstack/react-query";
import { Effect } from "effect";
import { Pressable, Text } from "react-native";

import { Forbidden, NotFound, Offline, Unavailable } from "@/errors";
import { useApiQuery } from "@/runtime/api-hooks";
import { shouldRetryQuery, useBackgroundRefreshToasts } from "@/runtime/query-client";
import { renderWithTheme } from "../components/support/theme";

const OFFLINE_MESSAGE = "You appear to be offline. Reconnect and retry.";

const FailedQuery = () => {
  useBackgroundRefreshToasts();
  const result = useApiQuery({
    program: Effect.fail(new Offline()),
    queryKey: ["failed-query"],
  });
  return <Text>{result.error?._tag ?? "pending"}</Text>;
};

it("keeps a first-load failure typed and leaves its message to the screen", async () => {
  await renderWithTheme(<FailedQuery />);
  await waitFor(() => expect(screen.getByText("Offline")).toBeTruthy());
  expect(screen.queryByText(OFFLINE_MESSAGE)).toBeNull();
});

let attempt = 0;
const flaky = Effect.suspend(() => {
  attempt += 1;
  return attempt === 1 ? Effect.succeed("cached") : Effect.fail(new Offline());
});

const RefreshingQuery = () => {
  useBackgroundRefreshToasts();
  const queryClient = useQueryClient();
  const result = useApiQuery({ program: flaky, queryKey: ["refreshing-query"] });
  return (
    <Pressable onPress={() => void queryClient.refetchQueries({ queryKey: ["refreshing-query"] })}>
      <Text>{`${result.data ?? "none"}:${result.error?._tag ?? "ok"}`}</Text>
    </Pressable>
  );
};

it("toasts a failed background refresh once and keeps the cached data", async () => {
  await renderWithTheme(<RefreshingQuery />);
  await waitFor(() => expect(screen.getByText("cached:ok")).toBeTruthy());

  await fireEvent.press(screen.getByText("cached:ok"));
  await waitFor(() => expect(screen.getByText("cached:Offline")).toBeTruthy());

  expect(screen.getAllByText(OFFLINE_MESSAGE)).toHaveLength(1);
});

it("retries only transient failures, at most twice", () => {
  expect(shouldRetryQuery(0, new Offline())).toBe(true);
  expect(shouldRetryQuery(1, new Unavailable({ requestId: "r" }))).toBe(true);
  expect(shouldRetryQuery(2, new Unavailable({ requestId: "r" }))).toBe(false);
  expect(shouldRetryQuery(0, new NotFound())).toBe(false);
  expect(shouldRetryQuery(0, new Forbidden())).toBe(false);
});

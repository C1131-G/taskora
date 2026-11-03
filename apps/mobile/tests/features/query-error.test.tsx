import { screen, waitFor } from "@testing-library/react-native";
import { Effect } from "effect";
import { Text } from "react-native";

import { Offline } from "@/errors";
import { useApiQuery } from "@/runtime/api-hooks";
import { renderWithTheme } from "../components/support/theme";

const FailedQuery = () => {
  const result = useApiQuery({
    program: Effect.fail(new Offline()),
    queryKey: ["failed-query"],
  });
  return <Text>{result.error?._tag ?? "pending"}</Text>;
};

it("shows failed reads as a toast and preserves their typed failure", async () => {
  await renderWithTheme(<FailedQuery />);
  await waitFor(() => expect(screen.getByText("You appear to be offline. Reconnect and retry.")).toBeTruthy());
  expect(screen.getByText("Offline")).toBeTruthy();
});

import { render, screen, userEvent, waitFor } from "@testing-library/react-native";

import { ErrorBoundary } from "@/components/workspace/route-error-boundary";

it("shows a toast for a route error and offers retry", async () => {
  const retry = jest.fn().mockResolvedValue(undefined);
  const user = userEvent.setup();
  await render(<ErrorBoundary error={new Error("internal details")} retry={retry} />);
  await waitFor(() => expect(screen.getByText("Something went wrong. Please try again.")).toBeTruthy());
  expect(screen.queryByText("internal details")).toBeNull();
  await user.press(screen.getByRole("button", { name: "Try again" }));
  expect(retry).toHaveBeenCalledTimes(1);
});

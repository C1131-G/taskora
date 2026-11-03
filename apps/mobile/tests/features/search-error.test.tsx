import { screen, userEvent, waitFor } from "@testing-library/react-native";
import { Effect } from "effect";

import { Offline } from "@/errors";
import { SearchScreen } from "@/features/workspace/domain-list-screen";
import { renderWithTheme } from "../components/support/theme";

jest.mock("@/features/navigation/workspace-tabs", () => {
  const React = require("react");
  return { WorkspaceTabShell: ({ children }: { readonly children: React.ReactNode }) => React.createElement(React.Fragment, null, children) };
});

it("shows search failures in a toast", async () => {
  const user = userEvent.setup();
  await renderWithTheme(<SearchScreen onHit={() => null} search={() => Effect.fail(new Offline())} />);

  await user.type(screen.getByLabelText("Search query"), "project");
  await user.press(screen.getByRole("button", { name: "Search" }));

  await waitFor(() => expect(screen.getByText("You appear to be offline. Reconnect and retry.")).toBeTruthy());
});

it("shows a fallback toast for unexpected search failures", async () => {
  const user = userEvent.setup();
  await renderWithTheme(<SearchScreen onHit={() => null} search={() => Effect.die(new Error("unexpected"))} />);
  await user.type(screen.getByLabelText("Search query"), "project");
  await user.press(screen.getByRole("button", { name: "Search" }));
  await waitFor(() => expect(screen.getByText("Could not search. Please try again.")).toBeTruthy());
});

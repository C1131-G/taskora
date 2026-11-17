import { Text } from "react-native";
import { render, screen } from "@testing-library/react-native";

import {
  WorkspaceLoadingRegion,
  WorkspaceLoadingSurface,
} from "@/components/workspace/workspace-loading";
import { renderWithTheme } from "./support/theme";

const region = (isLoading: boolean) => (
  <WorkspaceLoadingRegion isLoading={isLoading} label="Loading inbox">
    <Text>Update pricing page copy</Text>
  </WorkspaceLoadingRegion>
);

it("announces one busy status and hides placeholder content while loading", async () => {
  await render(region(true));

  const status = screen.getByRole("progressbar", { name: "Loading inbox" });
  expect(status.props.accessibilityState).toEqual({ busy: true });
  expect(screen.queryByText("Update pricing page copy")).toBeNull();
  expect(
    screen.getByText("Update pricing page copy", { includeHiddenElements: true }),
  ).toBeTruthy();
});

it("passes content through untouched once loaded", async () => {
  await render(region(true));
  await screen.rerender(region(false));

  expect(screen.queryByRole("progressbar")).toBeNull();
  expect(screen.getByText("Update pricing page copy")).toBeTruthy();
});

it("shows a blank busy surface for session gates", async () => {
  await renderWithTheme(<WorkspaceLoadingSurface />);

  const status = screen.getByRole("progressbar", { name: "Loading" });
  expect(status.props.accessibilityState).toEqual({ busy: true });
});

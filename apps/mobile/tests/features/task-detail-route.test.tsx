import { screen } from "@testing-library/react-native";

import TaskDetailRoute from "@/app/(workspace)/tasks/[id]";
import { renderWithTheme } from "../components/support/theme";
import { isInsideVerticalScrollView } from "../components/support/scroll-ancestor";

let mockRouteParams: { readonly id?: string } = {};

jest.mock("expo-router", () => ({
  useLocalSearchParams: () => mockRouteParams,
}));

it("shows the task skeleton, not the incomplete-link state, while the session restores", async () => {
  mockRouteParams = { id: "task-1" };
  await renderWithTheme(<TaskDetailRoute />);

  expect(screen.queryByText("This task link is incomplete.")).toBeNull();
  expect(screen.getByRole("progressbar", { name: "Loading task" })).toBeTruthy();
});

it("treats only a missing id as an incomplete link", async () => {
  mockRouteParams = {};
  await renderWithTheme(<TaskDetailRoute />);

  expect(screen.getByText("This task link is incomplete.")).toBeTruthy();
});

it("keeps the task detail frame real and skeletons only the content while loading", async () => {
  mockRouteParams = { id: "task-1" };
  await renderWithTheme(<TaskDetailRoute />);

  // The title sits above the scroll column, visible (default queries skip hidden elements).
  expect(isInsideVerticalScrollView(screen.getByRole("header", { name: "Task" }))).toBe(false);
  expect(isInsideVerticalScrollView(screen.getByRole("progressbar", { name: "Loading task" }))).toBe(true);
});

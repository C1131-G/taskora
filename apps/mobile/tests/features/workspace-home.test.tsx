import { screen } from "@testing-library/react-native";

import HomeRoute from "@/app/(workspace)/index";
import { renderWithTheme } from "../components/support/theme";

it("renders the home screen in its loading state without a session", async () => {
  await renderWithTheme(<HomeRoute />);

  expect(screen.getByRole("progressbar", { name: "Loading home" })).toBeTruthy();
  expect(screen.getByRole("button", { name: "More" })).toBeTruthy();
  expect(screen.queryByText("Website relaunch")).toBeNull();
});

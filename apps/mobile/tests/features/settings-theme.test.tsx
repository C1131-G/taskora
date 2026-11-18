import { act, screen, userEvent } from "@testing-library/react-native";
import { useState } from "react";

import { SettingsScreen } from "@/features/workspace/workspace-screens";
import { ThemeContext, type ThemeContextValue } from "@/theme/theme-provider";
import { renderWithTheme } from "../components/support/theme";

type Mode = ThemeContextValue["mode"];

// A theme owner whose mode the test can also change from outside the screen.
let setModeFromOutside: (mode: Mode) => void = () => undefined;

const OwnedTheme = () => {
  const [mode, setMode] = useState<Mode>("light");
  setModeFromOutside = setMode;
  const value: ThemeContextValue = {
    accent: "default",
    density: "regular",
    isDark: false,
    mode,
    setAccent: () => undefined,
    setDensity: () => undefined,
    setMode,
  };
  return (
    <ThemeContext.Provider value={value}>
      <SettingsScreen onSignOut={() => undefined} />
    </ThemeContext.Provider>
  );
};

const selected = (label: string): boolean | undefined =>
  screen.getByLabelText(label).props.accessibilityState?.selected;

it("marks the theme mode the provider holds, with no lagging copy", async () => {
  const user = userEvent.setup();
  await renderWithTheme(<OwnedTheme />);
  expect(selected("Theme light")).toBe(true);

  await user.press(screen.getByLabelText("Theme dark"));
  expect(selected("Theme dark")).toBe(true);
  expect(selected("Theme light")).toBe(false);

  await act(() => setModeFromOutside("system"));
  expect(selected("Theme system")).toBe(true);
  expect(selected("Theme dark")).toBe(false);
});

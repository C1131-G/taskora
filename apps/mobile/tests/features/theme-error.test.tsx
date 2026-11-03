import { render, screen, userEvent, waitFor } from "@testing-library/react-native";
import type { Effect } from "effect";
import { Button } from "react-native";

import { ErrorToastProvider, ErrorToastViewport } from "@/components/workspace/error-toast-provider";
import { ThemeProvider, useTheme } from "@/theme/theme-provider";

jest.mock("@/runtime/runtime", () => ({
  appRuntime: () => ({
    runPromiseExit: (program: Effect.Effect<unknown, unknown, unknown>) => {
      const { Effect } = require("effect");
      const { ThemePreferences } = require("@/services/theme-preferences");
      const { StorageFailure } = require("@/errors");
      return Effect.runPromiseExit(
        Effect.provideService(program, ThemePreferences, {
          load: Effect.fail(new StorageFailure({ cause: "unavailable" })),
          save: () => Effect.fail(new StorageFailure({ cause: "unavailable" })),
        }),
      );
    },
  }),
}));

const AppearanceControl = () => {
  const { setMode } = useTheme();
  return <Button onPress={() => setMode("dark")} title="Set dark mode" />;
};

it("reports appearance loading and saving failures through the themed toast viewport", async () => {
  const user = userEvent.setup();
  await render(
    <ErrorToastProvider renderViewport={false}>
      <ThemeProvider>
        <AppearanceControl />
        <ErrorToastViewport />
      </ThemeProvider>
    </ErrorToastProvider>,
  );

  await waitFor(() => expect(screen.getByText("Could not load appearance settings.")).toBeTruthy());
  await user.press(screen.getByRole("button", { name: "Set dark mode" }));
  await user.press(screen.getByRole("button", { name: "Dismiss" }));
  await waitFor(() => expect(screen.getByText("Could not save appearance settings.")).toBeTruthy());
});

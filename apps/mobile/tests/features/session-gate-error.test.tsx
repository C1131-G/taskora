import { screen, waitFor } from "@testing-library/react-native";

import { SessionGate } from "@/features/auth/session-gate";
import { renderWithTheme } from "../components/support/theme";

jest.mock("@/runtime/runtime", () => ({
  appRuntime: () => ({
    runPromiseExit: (program: unknown) => {
      const { Effect } = require("effect");
      return Effect.runPromiseExit(program);
    },
  }),
}));

it("shows a toast if session services cannot initialize", async () => {
  await renderWithTheme(<SessionGate>{null}</SessionGate>);
  await waitFor(() => expect(screen.getByText("Could not start your session. Please restart the app.")).toBeTruthy());
});

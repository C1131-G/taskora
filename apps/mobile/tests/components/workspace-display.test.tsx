import { screen, userEvent } from "@testing-library/react-native";
import { StyleSheet, View } from "react-native";
import { SafeAreaInsetsContext } from "react-native-safe-area-context";

import { WorkspaceAvatar } from "@/components/workspace/workspace-avatar";
import { WorkspaceChip } from "@/components/workspace/workspace-chip";
import { WorkspaceListRow } from "@/components/workspace/workspace-list-row";
import { WorkspaceUndoToast } from "@/components/workspace/workspace-undo";
import { FONT_SCALE_CAP } from "@/theme/type-scale";
import { renderWithTheme } from "./support/theme";

it("renders the chip with a selected state and a remove action", async () => {
  let removed = false;
  const user = userEvent.setup();
  await renderWithTheme(
    <WorkspaceChip
      color="green"
      label="design"
      onRemove={() => (removed = true)}
      selected
    />,
  );

  expect(screen.getByRole("button", { name: "Remove design" })).toBeTruthy();

  await user.press(screen.getByRole("button", { name: "Remove design" }));

  expect(removed).toBe(true);
});

it("shows the avatar initials and announces the name", async () => {
  await renderWithTheme(<WorkspaceAvatar name="Ada Lovelace" />);

  expect(screen.getByRole("image", { name: "Ada Lovelace" })).toBeTruthy();
  expect(screen.getByText("AL")).toBeTruthy();
});

it("presses a list row and shows subtitle and trailing slot", async () => {
  let opened = false;
  const user = userEvent.setup();
  await renderWithTheme(
    <WorkspaceListRow
      accessibilityLabel="Open task Ship the release"
      onPress={() => (opened = true)}
      subtitle="Due tomorrow"
      title="Ship the release"
      trailing={<View testID="trailing-badge" />}
    />,
  );

  await user.press(screen.getByRole("button", { name: "Open task Ship the release" }));

  expect(opened).toBe(true);
  expect(screen.getByText("Due tomorrow")).toBeTruthy();
  expect(screen.getByTestId("trailing-badge")).toBeTruthy();
});

it("renders a static list row without a button role", async () => {
  await renderWithTheme(<WorkspaceListRow title="Read only" />);

  expect(screen.getByText("Read only")).toBeTruthy();
  expect(screen.queryByRole("button")).toBeNull();
});

it("runs the undo action and dismisses the toast", async () => {
  const events: string[] = [];
  const user = userEvent.setup();
  await renderWithTheme(
    <WorkspaceUndoToast
      message="Task archived"
      onAction={() => events.push("undo")}
      onClose={() => events.push("close")}
      visible
    />,
  );

  await user.press(screen.getByRole("button", { name: "Undo" }));
  await user.press(screen.getByRole("button", { name: "Dismiss" }));

  expect(events).toEqual(["undo", "close"]);
});

it("makes a pressable chip a 44pt target that reports its state", async () => {
  let pressed = 0;
  const user = userEvent.setup();
  await renderWithTheme(
    <WorkspaceChip accessibilityRole="tab" label="Unread" onPress={() => (pressed += 1)} selected />,
  );

  const chip = screen.getByRole("tab", { name: "Unread" });
  expect(chip.props.accessibilityState.selected).toBe(true);
  // 28pt chip + 8 + 8 of vertical slop = 44pt.
  expect(chip.props.hitSlop).toMatchObject({ bottom: 8, top: 8 });
  expect(screen.getByText("Unread").props.maxFontSizeMultiplier).toBe(FONT_SCALE_CAP);

  await user.press(chip);

  expect(pressed).toBe(1);
});

it("gives the chip remove icon a 44pt touch target", async () => {
  await renderWithTheme(<WorkspaceChip label="design" onRemove={() => undefined} />);

  // 12pt icon + 16 of slop on each side = 44pt.
  expect(screen.getByRole("button", { name: "Remove design" }).props.hitSlop).toBe(16);
});

it("lifts the toast above the bottom safe area and grows its buttons to 44pt", async () => {
  await renderWithTheme(
    <SafeAreaInsetsContext.Provider value={{ bottom: 34, left: 0, right: 0, top: 0 }}>
      <WorkspaceUndoToast message="Task archived" onAction={() => undefined} onClose={() => undefined} visible />
    </SafeAreaInsetsContext.Provider>,
  );

  // The toast is the live region that wraps the message.
  let toast = screen.getByText("Task archived").parent;
  while (toast !== null && toast.props.accessibilityLiveRegion === undefined) {
    toast = toast.parent;
  }
  const toastStyle = StyleSheet.flatten(toast?.props.style);
  expect(toastStyle).toMatchObject({ bottom: 58 });
  expect(toastStyle.elevation).toBeUndefined();
  expect(screen.getByRole("button", { name: "Dismiss" }).props.hitSlop).toBe(14);
  expect(screen.getByRole("button", { name: "Undo" }).props.hitSlop).toMatchObject({ bottom: 12, top: 12 });
});

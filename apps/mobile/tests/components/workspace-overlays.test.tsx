import { screen, userEvent } from "@testing-library/react-native";
import { useState } from "react";
import { Pressable, Text } from "react-native";

import {
  WorkspaceConfirmDialog,
  WorkspaceModal,
} from "@/components/workspace/workspace-modal";
import { WorkspaceDisclosure } from "@/components/workspace/workspace-disclosure";
import { renderWithTheme } from "./support/theme";

it("shows the modal content when visible and hides it otherwise", async () => {
  await renderWithTheme(
    <>
      <WorkspaceModal onClose={() => undefined} title="Hidden panel" visible={false}>
        <Text>Hidden body</Text>
      </WorkspaceModal>
      <WorkspaceModal onClose={() => undefined} title="Edit task" visible>
        <Text>Visible body</Text>
      </WorkspaceModal>
    </>,
  );

  expect(screen.getByRole("header", { name: "Edit task" })).toBeTruthy();
  expect(screen.getByText("Visible body")).toBeTruthy();
  expect(screen.queryByText("Hidden body")).toBeNull();
});

// The dialog mounts during the render that makes it visible, then animates in.
const ModalOpener = () => {
  const [visible, setVisible] = useState(false);
  return (
    <>
      <Pressable accessibilityRole="button" onPress={() => setVisible(true)}>
        <Text>Open</Text>
      </Pressable>
      <WorkspaceModal onClose={() => setVisible(false)} title="Opened later" visible={visible}>
        <Text>Opened body</Text>
      </WorkspaceModal>
    </>
  );
};

it("mounts a modal that starts hidden once it becomes visible", async () => {
  const user = userEvent.setup();
  await renderWithTheme(<ModalOpener />);
  expect(screen.queryByText("Opened body")).toBeNull();

  await user.press(screen.getByRole("button", { name: "Open" }));

  expect(screen.getByRole("header", { name: "Opened later" })).toBeTruthy();
  expect(screen.getByText("Opened body")).toBeTruthy();
});

it("closes the modal from the overlay press", async () => {
  let closed = false;
  const user = userEvent.setup();
  await renderWithTheme(
    <WorkspaceModal
      onClose={() => {
        closed = true;
      }}
      title="Edit task"
      visible
    >
      <Text>Overlay body</Text>
    </WorkspaceModal>,
  );

  await user.press(screen.getByTestId("modal-overlay"));

  expect(closed).toBe(true);
});

it("fires confirm and cancel from the confirm dialog", async () => {
  const events: string[] = [];
  const user = userEvent.setup();
  await renderWithTheme(
    <WorkspaceConfirmDialog
      confirmLabel="Archive project"
      message="The project moves to the archive and stays readable."
      onCancel={() => events.push("cancel")}
      onConfirm={() => events.push("confirm")}
      title="Archive project"
      visible
    />,
  );

  expect(screen.getByRole("header", { name: "Archive project" })).toBeTruthy();
  // VoiceOver can only reach the actions if no ancestor collapses them.
  let ancestor = screen.getByRole("button", { name: "Cancel" }).parent;
  while (ancestor !== null) {
    expect(ancestor.props.accessible).not.toBe(true);
    ancestor = ancestor.parent;
  }

  await user.press(screen.getByRole("button", { name: "Cancel" }));
  await user.press(screen.getByRole("button", { name: "Archive project" }));

  expect(events).toEqual(["cancel", "confirm"]);
});

it("toggles the disclosure body and reports its expanded state", async () => {
  const user = userEvent.setup();
  await renderWithTheme(
    <WorkspaceDisclosure header="Milestones">
      <Text>Milestone rows</Text>
    </WorkspaceDisclosure>,
  );

  const header = screen.getByRole("button", { name: "Milestones" });
  expect(header.props.accessibilityState.expanded).toBe(false);
  expect(screen.queryByText("Milestone rows")).toBeNull();

  await user.press(header);
  expect(screen.getByText("Milestone rows")).toBeTruthy();
  expect(
    screen.getByRole("button", { name: "Milestones" }).props.accessibilityState.expanded,
  ).toBe(true);
});

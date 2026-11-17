import { screen } from "@testing-library/react-native";

import { InboxScreen } from "@/features/inbox/inbox-screen";
import type { InboxItem } from "@/features/inbox/queries";
import { renderWithTheme } from "../components/support/theme";
import { isInsideVerticalScrollView } from "../components/support/scroll-ancestor";

const ITEM: InboxItem = {
  actorId: null,
  actorName: null,
  createdAt: "2026-10-24T09:15:00.000Z",
  id: "notif-1",
  projectId: null,
  projectName: "Website relaunch",
  readAt: null,
  snippet: null,
  taskId: null,
  text: "Priya assigned you Update pricing page copy",
  type: "assignment",
};

it("keeps the inbox frame real and skeletons only the content while loading", async () => {
  await renderWithTheme(
    <InboxScreen api={null} isLoading items={[ITEM]} keys={null} onOpenTask={() => undefined} />,
  );

  // The title sits above the scroll column, visible (default queries skip hidden elements).
  expect(isInsideVerticalScrollView(screen.getByRole("header", { name: "Inbox" }))).toBe(false);
  expect(isInsideVerticalScrollView(screen.getByRole("progressbar", { name: "Loading inbox" }))).toBe(true);
});

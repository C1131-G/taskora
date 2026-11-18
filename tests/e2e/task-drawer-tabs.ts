import type { Page } from "@playwright/test";

type TaskSection =
  | "Client"
  | "Comments"
  | "Details"
  | "Files"
  | "Subtasks"
  | "Time";

// The task drawer groups its sections into tabs; opens one of them.
const openTaskSection = (page: Page, section: TaskSection) =>
  page
    .getByRole("tablist", { name: "Task sections" })
    .getByRole("tab", { name: section })
    .click();

export { openTaskSection };

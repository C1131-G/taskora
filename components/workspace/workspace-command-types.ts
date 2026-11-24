import type { Route } from "next";

export type CommandId =
  | "create-task"
  | "assign-task"
  | "set-status"
  | "go-home"
  | "go-tasks"
  | "go-projects"
  | "go-inbox"
  | "go-my-time"
  | "go-workload"
  | "go-budgets"
  | "go-intake-forms"
  | "go-webhooks"
  | "go-github"
  | "new-project"
  | "invite-member"
  | "show-shortcuts";

type CommandGroup = "Actions" | "Navigate" | "Help";

export interface WorkspaceCommand {
  readonly group: CommandGroup;
  readonly href?: Route;
  readonly id: CommandId;
  readonly keys: readonly string[];
  readonly label: string;
  // Task actions work on the open task, so they stay live over its drawer.
  readonly scope: "global" | "task";
}

export interface Viewer {
  readonly canCreateTask: boolean;
  readonly role: "admin" | "employee";
  // What the open task drawer, if any, lets this viewer do.
  readonly taskDrawer: "none" | "readonly" | "editable";
}

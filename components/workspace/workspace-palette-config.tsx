"use client";

/* eslint-disable shadcn/no-unknown-classes, shadcn/no-restyle */

import {
  Archive,
  Bell,
  CalendarBlank,
  ChartLineUp,
  CheckCircle,
  Clock,
  Files,
  FolderOpen,
  Gauge,
  GearSix,
  GithubLogo,
  House,
  Keyboard,
  ListChecks,
  Plus,
  Pulse,
  Scales,
  SquaresFour,
  Star,
  Tray,
  UserPlus,
  UsersThree,
  WebhooksLogo,
} from "@phosphor-icons/react";

import type {
  CommandId,
  WorkspaceCommand,
} from "@/components/workspace/workspace-command-types";

export const pages = [
  { Icon: House, href: "/", label: "Home" },
  { Icon: Tray, href: "/inbox", label: "Inbox" },
  { Icon: CheckCircle, href: "/my-tasks", label: "My Tasks" },
  { Icon: Clock, href: "/my-time", label: "My Time" },
  { Icon: Star, href: "/favorites", label: "Favorites" },
  { Icon: SquaresFour, href: "/overview", label: "Overview" },
  { Icon: FolderOpen, href: "/projects", label: "Projects" },
  { Icon: ListChecks, href: "/tasks", label: "Tasks" },
  { Icon: CalendarBlank, href: "/calendar", label: "Calendar" },
  { Icon: ChartLineUp, href: "/timeline", label: "Timeline" },
  { Icon: Files, href: "/files", label: "Files" },
  { Icon: UsersThree, href: "/members", label: "Members" },
  { Icon: Pulse, href: "/activity", label: "Activity" },
  { Icon: UsersThree, href: "/teams", label: "Teams" },
  { Icon: Bell, href: "/notifications", label: "Notifications" },
  { Icon: Archive, href: "/archive", label: "Archive" },
  { Icon: GearSix, href: "/settings", label: "Settings" },
] as const;

export const COMMAND_ICONS = {
  "assign-task": UsersThree,
  "create-task": Plus,
  "go-budgets": Gauge,
  "go-github": GithubLogo,
  "go-home": House,
  "go-inbox": Tray,
  "go-intake-forms": Tray,
  "go-my-time": Clock,
  "go-projects": FolderOpen,
  "go-tasks": ListChecks,
  "go-webhooks": WebhooksLogo,
  "go-workload": Scales,
  "invite-member": UserPlus,
  "new-project": FolderOpen,
  "set-status": CheckCircle,
  "show-shortcuts": Keyboard,
} as const satisfies Record<CommandId, unknown>;

// Task actions land on a control inside the open task drawer.
const TASK_CONTROL_SELECTORS = {
  "assign-task": '[data-task-drawer] [id$="-assignee-search"]',
  "set-status": '[data-task-drawer] [id$="-status"]',
} as const;

export type TaskControlId = keyof typeof TASK_CONTROL_SELECTORS;

export const focusTaskControl = (id: TaskControlId) => {
  const control = document.querySelector(TASK_CONTROL_SELECTORS[id]);
  if (control instanceof HTMLElement) {
    control.focus();
  }
};

export const isTaskControlId = (id: CommandId): id is TaskControlId =>
  id in TASK_CONTROL_SELECTORS;

// Navigation commands that have a "Go to" key show it beside their page below.
export const isPageShortcut = (command: WorkspaceCommand) =>
  command.group === "Navigate";

export const GO_TO_PREFIX = /^Go to /u;
export const listedHrefs = new Set<string>(pages.map(({ href }) => href));

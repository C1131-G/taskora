"use client";

/* eslint-disable shadcn/no-inline-styles, shadcn/no-restyle, shadcn/no-unknown-classes */

export const priorityOrder: Record<string, number> = {
  high: 1,
  low: 3,
  medium: 2,
  none: 4,
  urgent: 0,
};
export interface CalendarProject {
  readonly id: string;
  readonly name: string;
  readonly color: string;
}
export const NO_CALENDAR_PROJECTS: readonly CalendarProject[] = [];
// Each prefix ends just before the month offset value.
export type CalendarHrefPrefix =
  `${"/calendar" | "/my-tasks" | `/projects/${string}`}?${string}`;

export const NO_EMPLOYEES: readonly {
  readonly id: string;
  readonly name: string;
}[] = [];

export const CALENDAR_STATUSES = [
  "all",
  "backlog",
  "todo",
  "progress",
  "review",
  "done",
] as const;
export const CALENDAR_PRIORITIES = [
  "all",
  "urgent",
  "high",
  "medium",
  "low",
  "none",
] as const;
export const CALENDAR_SORTS = [
  "manual",
  "dueDate",
  "name",
  "priority",
] as const;

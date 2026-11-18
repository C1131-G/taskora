/* eslint-disable shadcn/no-unknown-classes, shadcn/no-inline-styles */

export const DAY_MS = 86_400_000;
export const MONTH_FORMATTER = new Intl.DateTimeFormat("en", {
  month: "long",
  timeZone: "UTC",
  year: "numeric",
});
export const WEEK_DAY_FORMATTER = new Intl.DateTimeFormat("en", {
  day: "numeric",
  month: "short",
  timeZone: "UTC",
});
export const DAY_FORMATTER = new Intl.DateTimeFormat("en", {
  day: "numeric",
  timeZone: "UTC",
});

export const ARROW_MARKERS = ["base", "active", "conflict"] as const;

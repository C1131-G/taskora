"use client";

/* eslint-disable shadcn/no-unknown-classes */

export const DUE_SUMMARY_DESCRIPTIONS: Readonly<Record<string, string>> = {
  overdue: "overdue",
  today: "due today",
  upcoming: "upcoming",
};

const DUE_FORMATTER = new Intl.DateTimeFormat("en", {
  day: "numeric",
  month: "short",
  year: "numeric",
});

export const formatDueDate = (value: string | null): string =>
  value ? DUE_FORMATTER.format(new Date(`${value}T00:00:00`)) : "—";

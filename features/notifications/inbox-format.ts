/* eslint-disable shadcn/no-unknown-classes */

export type InboxFilter =
  | "all"
  | "mention"
  | "assignment"
  | "comment"
  | "update";

export const FILTERS: readonly {
  readonly id: InboxFilter;
  readonly label: string;
}[] = [
  { id: "all", label: "All" },
  { id: "mention", label: "Mentions" },
  { id: "assignment", label: "Assignments" },
  { id: "comment", label: "Comments" },
  { id: "update", label: "Updates" },
];

const TYPE_LABELS: Readonly<Record<string, string>> = {
  assignment: "Assignment",
  comment: "Comment",
  due: "Due soon",
  mention: "Mention",
  update: "Update",
};

export const getTypeLabel = (type: string): string =>
  TYPE_LABELS[type] ?? "Notification";

export const DATE_FORMATTER = new Intl.DateTimeFormat("en", {
  dateStyle: "medium",
  timeStyle: "short",
});
const DATE_ONLY_FORMATTER = new Intl.DateTimeFormat("en", {
  day: "numeric",
  month: "short",
});

export const typeMatchesFilter = (
  type: string,
  filter: InboxFilter
): boolean => {
  if (filter === "all") {
    return true;
  }
  if (filter === "update") {
    return type === "update" || type === "due";
  }
  return type === filter;
};

const DAY_MS = 86_400_000;

export const getDayGroup = (value: string): string => {
  const startOfToday = new Date().setHours(0, 0, 0, 0);
  const days = Math.floor((startOfToday - new Date(value).getTime()) / DAY_MS);
  if (days < 0) {
    return "Today";
  }
  if (days < 1) {
    return "Yesterday";
  }
  return days < 7 ? "This week" : "Earlier";
};

export const getInitials = (name: string): string =>
  name
    .split(" ")
    .map((part) => part[0] ?? "")
    .join("")
    .slice(0, 2)
    .toUpperCase();

export const formatRelativeTime = (value: string): string => {
  const elapsed = Date.now() - new Date(value).getTime();
  const minutes = Math.max(1, Math.round(elapsed / 60_000));
  if (minutes < 60) {
    return `${minutes}m ago`;
  }
  const hours = Math.round(elapsed / 3_600_000);
  if (hours < 24) {
    return `${hours}h ago`;
  }
  const days = Math.round(elapsed / 86_400_000);
  return days < 7
    ? `${days}d ago`
    : DATE_ONLY_FORMATTER.format(new Date(value));
};

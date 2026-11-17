// Dates on the home dashboard follow the workspace time zone.

const DATE_PART_FORMATTER = new Intl.DateTimeFormat("en-CA", {
  day: "2-digit",
  month: "2-digit",
  timeZone: "Asia/Kolkata",
  year: "numeric",
});
const FULL_DATE_FORMATTER = new Intl.DateTimeFormat("en", {
  dateStyle: "full",
  timeZone: "Asia/Kolkata",
});
const HOUR_FORMATTER = new Intl.DateTimeFormat("en", {
  hour: "numeric",
  hourCycle: "h23",
  timeZone: "Asia/Kolkata",
});
const SHORT_DATE_FORMATTER = new Intl.DateTimeFormat("en", {
  day: "numeric",
  month: "short",
  timeZone: "UTC",
});

const greetingAt = (date: Date): string => {
  const hour = Number(HOUR_FORMATTER.format(date));
  if (hour < 12) {
    return "Good morning";
  }
  if (hour < 18) {
    return "Good afternoon";
  }
  return "Good evening";
};

const localDateString = (date: Date): string => {
  const parts = DATE_PART_FORMATTER.formatToParts(date);
  const part = (type: "year" | "month" | "day") =>
    parts.find((datePart) => datePart.type === type)?.value ?? "";
  return `${part("year")}-${part("month")}-${part("day")}`;
};

const formatFullDate = (date: Date): string => FULL_DATE_FORMATTER.format(date);

// A task or project due date ("2026-12-14") as "Dec 14".
const formatDueDate = (value: string | null): string => {
  if (!value) {
    return "No due date";
  }
  return SHORT_DATE_FORMATTER.format(new Date(`${value}T00:00:00Z`));
};

export { formatDueDate, formatFullDate, greetingAt, localDateString };

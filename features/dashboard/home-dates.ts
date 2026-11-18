// Dates on the home dashboard follow the workspace time zone.

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

const formatFullDate = (date: Date): string => FULL_DATE_FORMATTER.format(date);

// A task or project due date ("2026-12-14") as "Dec 14".
const formatDueDate = (value: string | null): string => {
  if (!value) {
    return "No due date";
  }
  return SHORT_DATE_FORMATTER.format(new Date(`${value}T00:00:00Z`));
};

export { formatDueDate, formatFullDate, greetingAt };

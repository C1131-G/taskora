// The one rule for an overdue task. `today` is the company calendar day
// (YYYY-MM-DD) from getCompanyToday, so every screen agrees around midnight.
export const isOverdue = (
  task: { readonly dueDate: string | null; readonly status: string },
  today: string
): boolean =>
  task.status !== "done" && task.dueDate !== null && task.dueDate < today;

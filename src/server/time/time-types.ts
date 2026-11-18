import type { TimeEntryView, TimeTotals } from "./time-report";

export interface TimeEntryInput {
  readonly billable: boolean;
  readonly minutes: number;
  readonly note: string | null;
  readonly taskId: string;
  readonly workDate: string;
}

export type TimeEntryChanges = Omit<TimeEntryInput, "taskId">;

export interface StartTimerInput {
  readonly billable: boolean;
  readonly note: string | null;
  readonly taskId: string;
}

export interface RunningTimer {
  readonly billable: boolean;
  readonly note: string | null;
  readonly startedAt: string;
  readonly taskId: string;
  readonly taskReference: string;
  readonly taskTitle: string;
}

export interface StartedTimer {
  // The entry saved from the timer that was running before, if any.
  readonly stopped: TimeEntryView | null;
  readonly timer: RunningTimer;
}

export interface TaskTime extends TimeTotals {
  readonly entries: readonly TimeEntryView[];
}

export interface WeeklyTime extends TimeTotals {
  readonly days: readonly { readonly date: string; readonly minutes: number }[];
  readonly entries: readonly TimeEntryView[];
  readonly weekStart: string;
}

export interface TaskOption {
  readonly reference: string;
  readonly taskId: string;
  readonly title: string;
}

export interface DateRange {
  readonly from: string;
  readonly to: string;
}

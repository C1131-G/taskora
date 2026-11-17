/* eslint-disable shadcn/no-unknown-classes, shadcn/no-inline-styles */

"use client";

import { CaretLeft, CaretRight } from "@phosphor-icons/react";
import Link from "next/link";

import { TimeEntryForm } from "@/features/time/components/time-entry-form";
import type { TaskChoice } from "@/features/time/components/time-entry-form";
import { TimeEntryList } from "@/features/time/components/time-entry-list";
import { TimerControl } from "@/features/time/components/timer-control";
import {
  formatMinutes,
  localToday,
  shiftWeek,
  weekLabel,
} from "@/features/time/time-format";
import { WEEKDAYS } from "@/features/time/weekdays";
import type { RunningTimer, WeeklyTime } from "@/src/server/time/time-tracking";

// A full bar is an eight hour day.
const FULL_DAY_MINUTES = 480;

export const MyTimeView = ({
  currentUserId,
  isAdmin,
  taskChoices,
  timer,
  week,
}: {
  readonly currentUserId: string;
  readonly isAdmin: boolean;
  readonly taskChoices: readonly TaskChoice[];
  readonly timer: RunningTimer | null;
  readonly week: WeeklyTime;
}) => {
  const today = localToday();
  const previous = {
    pathname: "/my-time",
    query: { week: shiftWeek(week.weekStart, -1) },
  } as const;
  const next = {
    pathname: "/my-time",
    query: { week: shiftWeek(week.weekStart, 1) },
  } as const;
  const loggedDays = week.days.filter(({ minutes }) => minutes > 0).length;
  return (
    <div className="my-time mt-layout">
      <div className="mt-main">
        <section aria-label="Week" className="mt-card">
          <nav aria-label="Week" className="mt-weeknav">
            <Link
              aria-label="Previous week"
              className="mt-iconbtn"
              href={previous}
            >
              <CaretLeft aria-hidden="true" size={16} />
            </Link>
            <h2 className="mt-weeklabel">{weekLabel(week.weekStart)}</h2>
            <Link aria-label="Next week" className="mt-iconbtn" href={next}>
              <CaretRight aria-hidden="true" size={16} />
            </Link>
          </nav>
          <dl className="mt-stats">
            <div>
              <dt>Logged</dt>
              <dd>{formatMinutes(week.totalMinutes)}</dd>
            </div>
            <div>
              <dt>Billable</dt>
              <dd>{formatMinutes(week.billableMinutes)}</dd>
            </div>
            <div>
              <dt>Days worked</dt>
              <dd>
                {loggedDays} <span>of 7</span>
              </dd>
            </div>
          </dl>
          <ol aria-label="Hours per day" className="mt-days">
            {week.days.map((day, index) => (
              <li
                className="mt-day"
                data-today={day.date === today || undefined}
                key={day.date}
              >
                <span className="mt-day-hours">
                  {day.minutes === 0 ? "—" : formatMinutes(day.minutes)}
                </span>
                <span aria-hidden="true" className="mt-day-track">
                  <span
                    className="mt-day-fill"
                    // A 0-1 share: the fill is clipped to it in my-time.css.
                    style={{
                      "--fill": Math.min(1, day.minutes / FULL_DAY_MINUTES),
                    }}
                  />
                </span>
                <span className="mt-day-name">{WEEKDAYS[index]}</span>
                <time dateTime={day.date}>{day.date.slice(8)}</time>
              </li>
            ))}
          </ol>
        </section>
        <section aria-label="Entries this week" className="mt-card">
          <h3 className="mt-title">Entries this week</h3>
          <TimeEntryList
            currentUserId={currentUserId}
            entries={week.entries}
            isAdmin={isAdmin}
            showTask
            today={today}
          />
        </section>
      </div>
      <aside className="mt-side">
        <section aria-label="Timer" className="mt-card">
          <h3 className="mt-title">Timer</h3>
          <TimerControl taskChoices={taskChoices} timer={timer} />
        </section>
        <section aria-label="Log time" className="mt-card">
          <h3 className="mt-title">Log time</h3>
          <TimeEntryForm
            idPrefix="my-time"
            taskChoices={taskChoices}
            today={today}
          />
        </section>
      </aside>
    </div>
  );
};

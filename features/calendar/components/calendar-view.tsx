/* eslint-disable shadcn/no-unknown-classes -- Workspace classes are defined in apps/web/app/workspace-styles. */

import {
  ArrowsDownUp,
  CaretLeft,
  CaretRight,
  FunnelSimple,
  Plus,
} from "@phosphor-icons/react/dist/ssr";
import { io } from "next/cache";
import type { ComponentProps } from "react";

import { Button } from "@/components/ui/button";
import {
  SKELETON_KEYS,
  SkeletonBone,
} from "@/components/workspace/skeleton-shapes";
import {
  SkeletonKeep,
  SkelterSurface,
} from "@/components/workspace/skelter-surface";
import { WorkspaceCalendar } from "@/components/workspace/workspace-calendar";
import { calendarPeriod } from "@/features/calendar/calendar-params";
import type { CalendarMode } from "@/features/calendar/calendar-params";
import {
  listCalendarEvents,
  listAllTaskCalendar,
} from "@/features/calendar/calendar-queries";
import { CalendarEventForm } from "@/features/calendar/components/calendar-event-form";
import { CalendarEventManager } from "@/features/calendar/components/calendar-event-manager";
import { listAllEmployees } from "@/features/people/people-queries";
import { listProjects } from "@/features/projects/projects-queries";
import { getPageSession } from "@/src/server/auth/page-session";

const CalendarView = async ({
  monthOffset,
  viewMode,
}: {
  readonly monthOffset: number;
  readonly viewMode: CalendarMode;
}) => {
  await io();
  const { label: monthLabel, range } = calendarPeriod(viewMode, monthOffset);
  const [tasks, events, session, projects, employeeResult] = await Promise.all([
    listAllTaskCalendar({
      from: range.from,
      groupBy: "none",
      limit: 200,
      priorities: [],
      sortBy: "dueDate",
      sortDirection: "asc",
      statuses: [],
      to: range.to,
    }),
    listCalendarEvents({
      from: range.fromInstant,
      to: range.toInstant,
    }),
    getPageSession(),
    listProjects({}),
    listAllEmployees(),
  ]);
  if (!tasks.ok || !events.ok) {
    throw new Error("Calendar could not be loaded.");
  }
  return (
    <>
      <WorkspaceCalendar
        events={events.data}
        employees={
          employeeResult.ok
            ? employeeResult.data.map(({ id, name }) => ({ id, name }))
            : []
        }
        monthLabel={monthLabel}
        monthOffset={monthOffset}
        currentUserId={
          session.kind === "authenticated" ? session.user.id : null
        }
        isAdmin={
          session.kind === "authenticated" && session.user.role === "admin"
        }
        projects={
          projects.ok
            ? projects.data.map(({ color, id, name }) => ({ color, id, name }))
            : []
        }
        tasks={tasks.data}
        viewMode={viewMode}
      />
      {session.kind === "authenticated" && session.user.role === "admin" ? (
        <CalendarEventForm />
      ) : null}
      <CalendarEventManager
        events={events.data}
        period={viewMode}
        isAdmin={
          session.kind === "authenticated" && session.user.role === "admin"
        }
      />
    </>
  );
};

const WEEKDAYS = [
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
  "Sunday",
] as const;

const DAY_COUNT = { month: 42, week: 7 } as const satisfies Record<
  CalendarMode,
  number
>;

const LEGEND_ITEMS = SKELETON_KEYS.slice(0, 3);

const EVENT_ROWS = SKELETON_KEYS.slice(0, 2);

// A control drawn with the real button classes, kept out of the tab order.
const StaticButton = (props: ComponentProps<typeof Button>) => (
  <Button {...props} inert tabIndex={-1} type="button" />
);

// Mirrors TaskCalendarGrid: toolbar, navigation and weekday names are static;
// the period label, project legend and every day cell are data.
const CalendarGridSkeleton = ({ mode }: { readonly mode: CalendarMode }) => (
  <SkelterSurface label="Loading calendar…">
    <section className="panel cal workspace-calendar">
      <div className="cal-bar">
        <div className="cal-bar-nav">
          <h2 className="calendar-month-label">
            <SkeletonBone shape="title" />
          </h2>
          <SkeletonKeep>
            <div className="cal-seg">
              <span className="cal-seg-item cal-seg-icon">
                <CaretLeft aria-hidden="true" size={16} />
              </span>
              <span className="cal-seg-item">Today</span>
              <span className="cal-seg-item cal-seg-icon">
                <CaretRight aria-hidden="true" size={16} />
              </span>
            </div>
          </SkeletonKeep>
        </div>
        <SkeletonKeep>
          <div className="toolbar calendar-toolbar">
            <span className="skeleton-filter-select skeleton-search calendar-search">
              Search tasks
            </span>
            <StaticButton size="sm" variant="outline">
              <FunnelSimple aria-hidden="true" size={16} /> Filter
            </StaticButton>
            <StaticButton size="sm" variant="ghost">
              <ArrowsDownUp aria-hidden="true" size={16} />
              Sort: Manual
            </StaticButton>
          </div>
        </SkeletonKeep>
        <SkeletonKeep>
          <div className="cal-seg">
            <span
              aria-current={mode === "month" ? "page" : undefined}
              className="cal-seg-item"
            >
              Month
            </span>
            <span
              aria-current={mode === "week" ? "page" : undefined}
              className="cal-seg-item"
            >
              Week
            </span>
          </div>
        </SkeletonKeep>
      </div>
      <div className="cal-filters">
        <ul className="calendar-project-legend skeleton-legend">
          {LEGEND_ITEMS.map((key) => (
            <li className="calendar-project-legend-item" key={key}>
              <SkeletonBone shape="short" />
            </li>
          ))}
        </ul>
      </div>
      <SkeletonKeep>
        <div className="cal-h">
          {WEEKDAYS.map((day) => (
            <div key={day}>{day}</div>
          ))}
        </div>
      </SkeletonKeep>
      <div className="cal-g workspace-calendar-grid">
        {SKELETON_KEYS.slice(0, DAY_COUNT[mode]).map((key) => (
          <div className="cday" key={key}>
            <span className="dn">
              <SkeletonBone shape="short" />
            </span>
          </div>
        ))}
      </div>
    </section>
  </SkelterSurface>
);

// Mirrors CalendarEventManager's list: a few one-line event rows.
const CalendarEventsSkeleton = ({ mode }: { readonly mode: CalendarMode }) => (
  <section className="panel">
    <div className="panel-h">
      <h2>Events this {mode}</h2>
    </div>
    <SkelterSurface label="Loading calendar events…">
      <div className="panel-b feed lined">
        {EVENT_ROWS.map((key) => (
          <span className="row calendar-event-skeleton-row" key={key}>
            <span aria-hidden="true" className="pdot" />
            <span className="grow">
              <SkeletonBone />
            </span>
            <SkeletonBone shape="short" />
          </span>
        ))}
      </div>
    </SkelterSurface>
  </section>
);

// The header's New task button shows whenever the workspace has a project, so
// its slot is kept. The admin-only New event button is not reserved.
const CalendarViewSkeleton = ({
  mode = "month",
}: {
  readonly mode?: CalendarMode;
}) => (
  <>
    <div className="ph">
      <div>
        <h1>Calendar</h1>
        <p>Deadlines and events across every project.</p>
      </div>
      <StaticButton aria-hidden="true" size="sm">
        <Plus aria-hidden="true" size={16} /> New task
      </StaticButton>
    </div>
    <CalendarGridSkeleton mode={mode} />
    <CalendarEventsSkeleton mode={mode} />
  </>
);

export { CalendarGridSkeleton, CalendarView, CalendarViewSkeleton };

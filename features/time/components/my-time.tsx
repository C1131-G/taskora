/* eslint-disable shadcn/no-unknown-classes */

import {
  SKELETON_KEYS,
  SkeletonBone,
} from "@/components/workspace/skeleton-shapes";
import { SkeletonRegion } from "@/components/workspace/skelter-surface";
import { MyTimeView } from "@/features/time/components/my-time-view";
import { TimeEntryForm } from "@/features/time/components/time-entry-form";
import { TimerControl } from "@/features/time/components/timer-control";
import {
  getRunningTimer,
  getWeeklyTime,
  listAssignedTaskOptions,
} from "@/features/time/time-queries";
import { WEEKDAYS } from "@/features/time/weekdays";
import { readOrThrow } from "@/lib/read-result";
import { getUtcToday } from "@/src/lib/utc-today";
import { getPageSession } from "@/src/server/auth/page-session";

const MyTime = async ({ date }: { readonly date: string | null }) => {
  // The session read comes first: it is request data, so the current date below
  // is computed at request time rather than while prerendering.
  const session = await getPageSession();
  if (session.kind !== "authenticated") {
    throw new Error("Your time could not be loaded.");
  }
  const [week, timer, options] = await Promise.all([
    getWeeklyTime({ date: date ?? getUtcToday() }),
    getRunningTimer({}),
    listAssignedTaskOptions({}),
  ]);
  return (
    <MyTimeView
      currentUserId={session.user.id}
      isAdmin={session.user.role === "admin"}
      taskChoices={readOrThrow(options, "Your tasks")}
      timer={readOrThrow(timer, "Your timer")}
      week={readOrThrow(week, "Your week")}
    />
  );
};

const STAT_LABELS = ["Logged", "Billable", "Days worked"] as const;

// MyTimeView's markup: the week's numbers and entries are bones; the timer and
// the log form are the real controls, inert until the data lands.
const MyTimeSkeleton = () => (
  <SkeletonRegion label="Loading your time…">
    <div className="my-time mt-layout">
      <div className="mt-main">
        <section className="mt-card">
          <div className="mt-weeknav">
            <span className="mt-iconbtn" />
            <h2 className="mt-weeklabel">
              <SkeletonBone shape="line" width="9em" />
            </h2>
            <span className="mt-iconbtn" />
          </div>
          <dl className="mt-stats">
            {STAT_LABELS.map((label) => (
              <div key={label}>
                <dt>{label}</dt>
                <dd>
                  <SkeletonBone shape="line" width="2ch" />
                </dd>
              </div>
            ))}
          </dl>
          <ol className="mt-days">
            {WEEKDAYS.map((weekday) => (
              <li className="mt-day" key={weekday}>
                <span className="mt-day-hours">
                  <SkeletonBone shape="line" width="2ch" />
                </span>
                <span className="mt-day-track" />
                <span className="mt-day-name">{weekday}</span>
                <time>
                  <SkeletonBone shape="line" width="2ch" />
                </time>
              </li>
            ))}
          </ol>
        </section>
        <section className="mt-card">
          <h3 className="mt-title">Entries this week</h3>
          <ul className="time-entries">
            {SKELETON_KEYS.slice(0, 2).map((key) => (
              <li className="time-entry" key={key}>
                <span className="time-entry-minutes">
                  <SkeletonBone shape="line" width="3em" />
                </span>
                <span className="time-entry-body">
                  <SkeletonBone shape="line" width="16em" />
                </span>
              </li>
            ))}
          </ul>
        </section>
      </div>
      <aside className="mt-side">
        <section className="mt-card">
          <h3 className="mt-title">Timer</h3>
          <TimerControl timer={null} />
        </section>
        <section className="mt-card">
          <h3 className="mt-title">Log time</h3>
          <TimeEntryForm idPrefix="my-time-skeleton" today="" />
        </section>
      </aside>
    </div>
  </SkeletonRegion>
);

export { MyTime, MyTimeSkeleton };

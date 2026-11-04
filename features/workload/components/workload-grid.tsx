/* eslint-disable shadcn/no-unknown-classes */

import type { CSSProperties } from "react";

import {
  SkeletonBone,
  SkeletonStats,
} from "@/components/workspace/skeleton-shapes";
import {
  hoursLabel,
  taskCountLabel,
  weekLabel,
} from "@/features/workload/workload-format";
import { getWorkload } from "@/features/workload/workload-queries";
import { readOrThrow } from "@/lib/read-result";

const workloadLevel = (
  overloaded: boolean,
  loadHours: number,
  capacityHours: number,
  taskCount: number
): "over" | "high" | "ok" | "none" => {
  if (overloaded) {
    return "over";
  }
  if (loadHours > capacityHours * 0.7) {
    return "high";
  }
  if (taskCount > 0) {
    return "ok";
  }
  return "none";
};

const workloadWidth = (loadHours: number, capacityHours: number): string =>
  `${Math.min(100, Math.round((loadHours / capacityHours) * 100))}%`;

// One row per teammate, one column per week: how much is due and how many
// estimated hours it adds up to. A week over the threshold says so in words.
const WorkloadGrid = async () => {
  const result = await getWorkload({});
  const workload = readOrThrow(result, "Workload");
  if (workload.people.length === 0) {
    return (
      <section className="panel panel-b">
        <p className="muted">No teammates to show yet.</p>
      </section>
    );
  }
  const overloadedWeeks = workload.people.reduce(
    (sum, person) =>
      sum + person.weeks.filter((week) => week.overloaded).length,
    0
  );
  const overdueTotal = workload.people.reduce(
    (sum, person) => sum + person.overdueCount,
    0
  );
  return (
    <section aria-label="Team workload" className="workload">
      <div className="stats workload-stats">
        <div className="stat">
          <span className="k">Teammates</span>
          <span className="v">{workload.people.length}</span>
          <span className="d">Shown below</span>
        </div>
        <div className="stat">
          <span className="k">Weekly capacity</span>
          <span className="v">{workload.capacityHours}h</span>
          <span className="d">Per person</span>
        </div>
        <div className={`stat${overloadedWeeks > 0 ? " alert" : ""}`}>
          <span className="k">Over capacity</span>
          <span className="v">{overloadedWeeks}</span>
          <span className="d">Person-weeks to rebalance</span>
        </div>
        <div className={`stat${overdueTotal > 0 ? " alert" : ""}`}>
          <span className="k">Overdue tasks</span>
          <span className="v">{overdueTotal}</span>
          <span className="d">Counted in the first week</span>
        </div>
      </div>
      <ul aria-label="How to read the grid" className="workload-legend">
        <li>
          <span aria-hidden="true" className="workload-swatch is-ok" />
          Within capacity
        </li>
        <li>
          <span aria-hidden="true" className="workload-swatch is-high" />
          Over 70% of capacity
        </li>
        <li>
          <span aria-hidden="true" className="workload-swatch is-over" />
          Over {workload.capacityHours}h
        </li>
        <li className="workload-legend-note">
          Tasks without an estimate are weighted by priority.
        </li>
      </ul>
      <div className="tbl-wrap">
        <table className="tbl workload-table">
          <caption className="sr-only">
            Open tasks and estimated hours due per person, by week
          </caption>
          <thead>
            <tr>
              <th scope="col">Person</th>
              {workload.weeks.map((weekStart) => (
                <th key={weekStart} scope="col">
                  <span className="sr-only">Week of </span>
                  {weekLabel(weekStart)}
                </th>
              ))}
              <th scope="col">No due date</th>
            </tr>
          </thead>
          <tbody>
            {workload.people.map((person) => (
              <tr key={person.userId}>
                <th aria-label={person.name} scope="row">
                  <span className="workload-person">
                    <span aria-hidden="true" className="workload-avatar">
                      {person.name.slice(0, 1).toUpperCase()}
                    </span>
                    <span className="workload-person-copy">
                      <span className="workload-name">{person.name}</span>
                      {person.overdueCount > 0 ? (
                        <span className="workload-overdue">
                          {person.overdueCount} overdue
                        </span>
                      ) : null}
                    </span>
                  </span>
                </th>
                {person.weeks.map((week) => (
                  <td
                    className="workload-cell"
                    data-level={workloadLevel(
                      week.overloaded,
                      week.loadHours,
                      workload.capacityHours,
                      week.taskCount
                    )}
                    data-overloaded={week.overloaded}
                    key={week.weekStart}
                  >
                    {week.taskCount === 0 ? (
                      <span className="workload-empty">
                        <span aria-hidden="true">–</span>
                        <span className="sr-only">No tasks</span>
                      </span>
                    ) : (
                      <>
                        <strong>{hoursLabel(week.loadHours)}</strong>
                        <span className="workload-count">
                          {taskCountLabel(week.taskCount)}
                        </span>
                        <span aria-hidden="true" className="workload-bar">
                          <span
                            style={
                              {
                                "--workload-bar-width": workloadWidth(
                                  week.loadHours,
                                  workload.capacityHours
                                ),
                              } as CSSProperties
                            }
                          />
                        </span>
                        {week.overloaded ? (
                          <span className="workload-flag">Over capacity</span>
                        ) : null}
                      </>
                    )}
                  </td>
                ))}
                <td className="workload-cell">
                  {person.unscheduled.taskCount === 0 ? (
                    <span className="workload-empty">
                      <span aria-hidden="true">–</span>
                      <span className="sr-only">No tasks</span>
                    </span>
                  ) : (
                    <>
                      <strong>
                        {hoursLabel(person.unscheduled.loadHours)}
                      </strong>
                      <span className="workload-count">
                        {taskCountLabel(person.unscheduled.taskCount)}
                      </span>
                    </>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
};

const SKELETON_ROWS = ["a", "b", "c", "d", "e", "f"] as const;
const SKELETON_WEEKS = ["w1", "w2", "w3", "w4", "w5", "w6"] as const;

// The summary strip, the legend and the grid frame at their real sizes; only the
// people and their weekly numbers are placeholders.
const WorkloadGridSkeleton = () => (
  <output aria-busy="true" className="workload">
    <span className="sr-only">Loading workload…</span>
    <SkeletonStats />
    <div aria-hidden="true" className="workload-legend">
      <SkeletonBone shape="short" />
    </div>
    <div aria-hidden="true" className="tbl-wrap">
      <table className="tbl workload-table">
        <thead>
          <tr>
            <th scope="col">Person</th>
            {SKELETON_WEEKS.map((key) => (
              <th key={key} scope="col">
                <SkeletonBone shape="short" />
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {SKELETON_ROWS.map((row) => (
            <tr key={row}>
              <th scope="row">
                <span className="workload-person">
                  <SkeletonBone shape="avatar" />
                  <SkeletonBone />
                </span>
              </th>
              {SKELETON_WEEKS.map((key) => (
                <td className="workload-cell" key={key}>
                  <SkeletonBone shape="short" />
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  </output>
);

export { WorkloadGrid, WorkloadGridSkeleton };

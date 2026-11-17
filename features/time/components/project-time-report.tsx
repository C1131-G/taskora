/* eslint-disable shadcn/no-unknown-classes */

import {
  SKELETON_KEYS,
  SkeletonBone,
} from "@/components/workspace/skeleton-shapes";
import { SkeletonRegion } from "@/components/workspace/skelter-surface";
import { getProject } from "@/features/projects/projects-queries";
import { ProjectTimeExport } from "@/features/time/components/project-time-export";
import { formatMinutes } from "@/features/time/time-format";
import { getProjectTimeReport } from "@/features/time/time-queries";
import { readRecordOrNotFound } from "@/lib/read-result";

const ProjectTimeReport = async ({
  from,
  projectId,
  to,
}: {
  readonly from: string;
  readonly projectId: string;
  readonly to: string;
}) => {
  const [project, result] = await Promise.all([
    getProject(projectId),
    getProjectTimeReport({ from, projectId, to }),
  ]);
  if (!result.ok && result.error.code === "FORBIDDEN") {
    return (
      <section className="panel panel-b">
        <h2>{project.name}</h2>
        <output className="muted">
          Only administrators and members of this project can see its time.
        </output>
      </section>
    );
  }
  const report = readRecordOrNotFound(result, "The time report");
  return (
    <div className="stack project-time">
      <form action={`/projects/${projectId}/time`} className="time-range">
        <div className="field">
          <label htmlFor="time-from">From</label>
          <input
            className="input"
            defaultValue={from}
            id="time-from"
            name="from"
            required
            type="date"
          />
        </div>
        <div className="field">
          <label htmlFor="time-to">To</label>
          <input
            className="input"
            defaultValue={to}
            id="time-to"
            name="to"
            required
            type="date"
          />
        </div>
        <button className="btn btn-secondary btn-sm" type="submit">
          Update
        </button>
        <ProjectTimeExport
          from={from}
          projectId={projectId}
          projectKey={project.key}
          to={to}
        />
      </form>
      <dl className="time-summary">
        <div>
          <dt>Total</dt>
          <dd>{formatMinutes(report.totalMinutes)}</dd>
        </div>
        <div>
          <dt>Billable</dt>
          <dd>{formatMinutes(report.billableMinutes)}</dd>
        </div>
        <div>
          <dt>Not billable</dt>
          <dd>{formatMinutes(report.nonBillableMinutes)}</dd>
        </div>
      </dl>
      {report.totalMinutes === 0 ? (
        <section className="panel panel-b">
          <p className="muted">
            No time was logged on {project.name} in this period.
          </p>
        </section>
      ) : (
        <>
          <section aria-label="By person" className="stack">
            <h2>By person</h2>
            <div className="tbl-wrap">
              <table className="tbl time-table">
                <thead>
                  <tr>
                    <th scope="col">Person</th>
                    <th scope="col">Total</th>
                    <th scope="col">Billable</th>
                  </tr>
                </thead>
                <tbody>
                  {report.byPerson.map((person) => (
                    <tr key={person.userId}>
                      <td>{person.name}</td>
                      <td>{formatMinutes(person.totalMinutes)}</td>
                      <td>{formatMinutes(person.billableMinutes)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
          <section aria-label="By task" className="stack">
            <h2>By task</h2>
            <div className="tbl-wrap">
              <table className="tbl time-table">
                <thead>
                  <tr>
                    <th scope="col">Task</th>
                    <th scope="col">Total</th>
                    <th scope="col">Billable</th>
                  </tr>
                </thead>
                <tbody>
                  {report.byTask.map((task) => (
                    <tr key={task.taskId}>
                      <td>
                        <strong>{task.taskReference}</strong> {task.taskTitle}
                      </td>
                      <td>{formatMinutes(task.totalMinutes)}</td>
                      <td>{formatMinutes(task.billableMinutes)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        </>
      )}
    </div>
  );
};

const SKELETON_RANGE_FIELDS = [
  ["From", "time-from"],
  ["To", "time-to"],
] as const;
const SKELETON_SUMMARY = ["Total", "Billable", "Not billable"] as const;
const SKELETON_TABLES = [
  ["By person", "Person"],
  ["By task", "Task"],
] as const;

// ProjectTimeReport's markup: labels, headings and column titles stay; dates,
// totals and rows are bones.
const ProjectTimeReportSkeleton = () => (
  <SkeletonRegion label="Loading the time report…">
    <div className="stack project-time">
      <div className="time-range">
        {SKELETON_RANGE_FIELDS.map(([label, id]) => (
          <div className="field" key={id}>
            <label htmlFor={`skeleton-${id}`}>{label}</label>
            <input
              className="input"
              id={`skeleton-${id}`}
              readOnly
              tabIndex={-1}
              type="date"
            />
          </div>
        ))}
        <span className="btn btn-secondary btn-sm">Update</span>
        <span className="btn btn-secondary btn-sm">Export CSV</span>
      </div>
      <dl className="time-summary">
        {SKELETON_SUMMARY.map((label) => (
          <div key={label}>
            <dt>{label}</dt>
            <dd>
              <SkeletonBone shape="line" width="4em" />
            </dd>
          </div>
        ))}
      </dl>
      {SKELETON_TABLES.map(([heading, firstColumn]) => (
        <section className="stack" key={heading}>
          <h2>{heading}</h2>
          <div className="tbl-wrap">
            <table className="tbl time-table">
              <thead>
                <tr>
                  <th scope="col">{firstColumn}</th>
                  <th scope="col">Total</th>
                  <th scope="col">Billable</th>
                </tr>
              </thead>
              <tbody>
                {SKELETON_KEYS.slice(0, 3).map((key) => (
                  <tr key={key}>
                    <td>
                      <SkeletonBone shape="line" width="10em" />
                    </td>
                    <td>
                      <SkeletonBone shape="line" width="3em" />
                    </td>
                    <td>
                      <SkeletonBone shape="line" width="3em" />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      ))}
    </div>
  </SkeletonRegion>
);

export { ProjectTimeReport, ProjectTimeReportSkeleton };

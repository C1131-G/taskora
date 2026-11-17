/* eslint-disable shadcn/no-restyle, shadcn/no-unknown-classes -- Project bug view uses reference workspace styles in apps/web/app/workspace-styles. */

import type { BugListItemSchema } from "@/src/server/work/bug-management";

import { BugList } from "./bug-list";
import { BugReportDialog } from "./bug-report-dialog";

const DONE_STATUSES = new Set(["closed", "duplicate", "withdrawn", "released"]);

export const ProjectBugs = ({
  bugs,
  project,
}: {
  readonly bugs: readonly (typeof BugListItemSchema.Type)[];
  readonly project: {
    readonly id: string;
    readonly key: string;
    readonly name: string;
  };
}) => {
  const open = bugs.filter((entry) => !DONE_STATUSES.has(entry.bug.status));
  const stats = [
    { label: "Total", value: bugs.length },
    { label: "Open", value: open.length },
    { label: "Resolved", value: bugs.length - open.length },
    {
      label: "Client reports",
      value: bugs.filter((entry) => entry.bug.clientCompanyId).length,
    },
  ];
  return (
    <section
      aria-labelledby="project-bugs-heading"
      className="project-bugs-view"
    >
      <header className="bug-page-header">
        <div>
          <h2 id="project-bugs-heading">Project bugs</h2>
          <p className="muted">Reports and fix history for {project.name}.</p>
        </div>
        <BugReportDialog initialProjectId={project.id} projects={[project]} />
      </header>
      <dl aria-label="Bug summary" className="bug-summary">
        {stats.map((stat) => (
          <div className="bug-summary-item" key={stat.label}>
            <dd>{stat.value}</dd>
            <dt>{stat.label}</dt>
          </div>
        ))}
      </dl>
      <BugList
        bugs={bugs}
        emptyMessage="This project has no bug reports yet."
      />
    </section>
  );
};

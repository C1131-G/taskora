/* eslint-disable shadcn/no-unknown-classes, shadcn/no-restyle */

import { FolderOpen } from "@phosphor-icons/react/dist/ssr";
import Link from "next/link";

import { Progress } from "@/components/ui/progress";
import {
  Table,
  TableBody,
  TableCaption,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { EmptyState } from "@/components/workspace/empty-state";
import {
  SKELETON_KEYS,
  SkeletonBone,
} from "@/components/workspace/skeleton-shapes";
import { projectStatusLabels } from "@/features/dashboard/overview-labels";
import { ProjectCreateForm } from "@/features/projects/components/project-create-form";
import { ProjectIcon } from "@/features/projects/components/project-icon";
import type { ProjectListItem } from "@/src/server/projects/project-contracts";

const COLUMNS = [
  "Project",
  "Status",
  "Progress",
  "Open",
  "Overdue",
  "Due",
] as const;

const OverviewPortfolioPanel = ({
  employeesById,
  isAdmin,
  projects,
}: {
  readonly employeesById: ReadonlyMap<string, string>;
  readonly isAdmin: boolean;
  readonly projects: readonly ProjectListItem[];
}) => (
  <section aria-labelledby="overview-portfolio-heading" className="panel">
    <div className="panel-h">
      <h2 id="overview-portfolio-heading">Portfolio</h2>
      <Link className="btn btn-sm btn-ghost" href="/projects">
        All projects
      </Link>
    </div>
    {projects.length ? (
      <Table className="perm-t overview-project-table">
        <TableCaption className="sr-only">Project portfolio</TableCaption>
        <TableHeader>
          <TableRow>
            {COLUMNS.map((column) => (
              <TableHead key={column}>{column}</TableHead>
            ))}
          </TableRow>
        </TableHeader>
        <TableBody>
          {projects.map((project) => (
            <TableRow key={project.id}>
              <TableCell>
                <Link
                  aria-label={`Open ${project.name}`}
                  className="row"
                  href={`/projects/${project.id}`}
                >
                  <ProjectIcon color={project.color} icon={project.icon} />
                  <span className="ov-project">
                    <span className="ov-project-name">{project.name}</span>
                    <span className="ov-project-lead">
                      {project.leadId
                        ? (employeesById.get(project.leadId) ?? "Inactive lead")
                        : "Unassigned"}
                    </span>
                  </span>
                </Link>
              </TableCell>
              <TableCell>
                <span className={`pstatus ${project.status}`}>
                  {projectStatusLabels[project.status]}
                </span>
              </TableCell>
              <TableCell>
                <span className="row">
                  <Progress
                    aria-label={`${project.progress}% complete`}
                    max={100}
                    value={project.progress}
                    workspace
                  />
                  <span className="num">{project.progress}%</span>
                </span>
              </TableCell>
              <TableCell>{project.openTaskCount}</TableCell>
              <TableCell>
                <span
                  className={`ov-overdue${project.overdueTaskCount > 0 ? " has" : ""}`}
                >
                  {project.overdueTaskCount}
                </span>
              </TableCell>
              <TableCell>{project.dueDate ?? "—"}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    ) : (
      <EmptyState
        action={
          isAdmin ? <ProjectCreateForm triggerLabel="Create project" /> : null
        }
        description={
          isAdmin
            ? "Create a project to start tracking its tasks and progress here."
            : "Projects you can see appear here once an admin creates them."
        }
        icon={FolderOpen}
        title="No projects yet"
      />
    )}
  </section>
);

// The real panel and table with bones in the cells. It sits inside the
// overview's skeleton region, so it carries no busy region of its own.
const OverviewPortfolioPanelSkeleton = () => (
  <section className="panel">
    <div className="panel-h">
      <h2>Portfolio</h2>
      <span className="btn btn-sm btn-ghost">All projects</span>
    </div>
    <Table className="perm-t overview-project-table">
      <TableHeader>
        <TableRow>
          {COLUMNS.map((column) => (
            <TableHead key={column}>{column}</TableHead>
          ))}
        </TableRow>
      </TableHeader>
      <TableBody>
        {SKELETON_KEYS.slice(0, 5).map((key) => (
          <TableRow key={key}>
            <TableCell>
              <span className="row">
                <SkeletonBone shape="line" width="16px" />
                <span className="ov-project">
                  <span className="ov-project-name">
                    <SkeletonBone shape="line" width="9em" />
                  </span>
                  <span className="ov-project-lead">
                    <SkeletonBone shape="line" width="6em" />
                  </span>
                </span>
              </span>
            </TableCell>
            <TableCell>
              <span className="pstatus">
                <SkeletonBone shape="line" width="5em" />
              </span>
            </TableCell>
            <TableCell>
              <span className="row">
                <Progress max={100} value={0} workspace />
                <span className="num">
                  <SkeletonBone shape="line" width="2.5em" />
                </span>
              </span>
            </TableCell>
            <TableCell>
              <SkeletonBone shape="line" width="2ch" />
            </TableCell>
            <TableCell>
              <SkeletonBone shape="line" width="2ch" />
            </TableCell>
            <TableCell>
              <SkeletonBone shape="line" width="6em" />
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  </section>
);

export { OverviewPortfolioPanel, OverviewPortfolioPanelSkeleton };

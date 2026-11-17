/* eslint-disable shadcn/no-unknown-classes, shadcn/no-restyle */

import Link from "next/link";

import { Avatar, AvatarFallback } from "@/components/ui/avatar";
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
import {
  SKELETON_KEYS,
  SkeletonBone,
} from "@/components/workspace/skeleton-shapes";
import { SkeletonRegion } from "@/components/workspace/skelter-surface";
import { formatDueDate } from "@/features/dashboard/home-dates";
import { projectStatusLabels } from "@/features/dashboard/overview-labels";
import { ProjectIcon } from "@/features/projects/components/project-icon";
import { ProjectMemberAvatars } from "@/features/projects/components/project-list-layouts";
import type { EmployeeDirectoryEntry } from "@/src/server/people/user-contracts";
import type { ProjectListItem } from "@/src/server/projects/project-contracts";

const COLUMNS = ["Project", "Status", "Progress", "Due", "Team"] as const;

const ProjectProgressPanel = ({
  projects,
  membersById,
}: {
  readonly projects: readonly ProjectListItem[];
  readonly membersById: ReadonlyMap<string, EmployeeDirectoryEntry>;
}) => (
  <section className="panel home-progress-panel">
    <div className="panel-h">
      <h2>Project progress</h2>
      <Link className="btn btn-sm btn-ghost" href="/projects">
        All projects
      </Link>
    </div>
    <Table className="perm-t home-progress-table">
      <TableCaption className="sr-only">Project progress</TableCaption>
      <TableHeader>
        <TableRow>
          {COLUMNS.map((column) => (
            <TableHead key={column}>{column}</TableHead>
          ))}
        </TableRow>
      </TableHeader>
      <TableBody>
        {projects.slice(0, 8).map((project) => (
          <TableRow key={project.id}>
            <TableCell>
              <Link
                className="row"
                href={`/projects/${project.id}?view=overview`}
              >
                <ProjectIcon
                  color={project.color}
                  icon={project.icon}
                  size={14}
                />
                <strong>{project.name}</strong>
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
                <span className="num faint">{project.progress}%</span>
              </span>
            </TableCell>
            <TableCell className="num muted">
              {formatDueDate(project.dueDate)}
            </TableCell>
            <TableCell>
              <ProjectMemberAvatars
                memberIds={project.memberIds}
                membersById={membersById}
              />
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  </section>
);

// The real table with bones in its cells; a few rows stand in for the list.
const ProjectProgressPanelSkeleton = () => (
  <section className="panel home-progress-panel">
    <div className="panel-h">
      <h2>Project progress</h2>
      <span aria-hidden="true" className="btn btn-sm btn-ghost">
        All projects
      </span>
    </div>
    <SkeletonRegion label="Loading project progress…">
      <Table className="perm-t home-progress-table">
        <TableHeader>
          <TableRow>
            {COLUMNS.map((column) => (
              <TableHead key={column}>{column}</TableHead>
            ))}
          </TableRow>
        </TableHeader>
        <TableBody>
          {SKELETON_KEYS.slice(0, 4).map((key) => (
            <TableRow key={key}>
              <TableCell>
                <span className="row">
                  <SkeletonBone shape="line" width="14px" />
                  <strong>
                    <SkeletonBone shape="line" width="9em" />
                  </strong>
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
                  <span className="num faint">
                    <SkeletonBone shape="line" width="2.5em" />
                  </span>
                </span>
              </TableCell>
              <TableCell className="num muted">
                <SkeletonBone shape="line" width="3.5em" />
              </TableCell>
              <TableCell>
                <ul className="project-members">
                  {SKELETON_KEYS.slice(0, 3).map((member) => (
                    <li key={member}>
                      <Avatar className="project-member-avatar">
                        <AvatarFallback />
                      </Avatar>
                    </li>
                  ))}
                </ul>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </SkeletonRegion>
  </section>
);

export { ProjectProgressPanel, ProjectProgressPanelSkeleton };

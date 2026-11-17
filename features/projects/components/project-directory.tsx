/* eslint-disable shadcn/no-unknown-classes, shadcn/no-restyle -- Workspace classes are defined in apps/web/app/workspace-styles. */

import Link from "next/link";

import { ViewSwitchTransition } from "@/components/ui/view-switch-transition";
import { ErrorToast } from "@/components/workspace/error-toast";
import {
  SKELETON_KEYS,
  SkeletonDataGrid,
} from "@/components/workspace/skeleton-shapes";
import { SkelterSurface } from "@/components/workspace/skelter-surface";
import { WorkspaceButton } from "@/components/workspace/workspace-button";
import { getPersonalWorkspace } from "@/features/discovery/discovery-queries";
import { listAllEmployees } from "@/features/people/people-queries";
import { ProjectCreateForm } from "@/features/projects/components/project-create-form";
import { ProjectFilterBar } from "@/features/projects/components/project-filter-bar";
import {
  ProjectCardSkeleton,
  ProjectGridView,
  ProjectTableView,
} from "@/features/projects/components/project-list-layouts";
import type { ProjectFilters } from "@/features/projects/project-filters";
import { listAllProjects } from "@/features/projects/projects-queries";
import { readOrThrow } from "@/lib/read-result";
import { getPageSession } from "@/src/server/auth/page-session";

const ProjectDirectory = async ({
  filters,
}: {
  readonly filters: ProjectFilters;
}) => {
  const [result, session, personal, employeeResult] = await Promise.all([
    listAllProjects(),
    getPageSession(),
    getPersonalWorkspace({}),
    listAllEmployees(),
  ]);
  if (!result.ok) {
    throw new Error("Projects could not be loaded.");
  }
  const favoriteProjectIds = new Set(
    personal.ok ? personal.data.projects.map((project) => project.id) : []
  );
  const { query, sort, status: selectedStatus, view } = filters;
  const projects = result.data
    .filter((project) => {
      const matchesQuery =
        `${project.name} ${project.key} ${project.description ?? ""}`
          .toLocaleLowerCase()
          .includes(query.toLocaleLowerCase());
      return (
        matchesQuery && (!selectedStatus || project.status === selectedStatus)
      );
    })
    .toSorted((left, right) => {
      if (sort === "recent") {
        return right.updatedAt.localeCompare(left.updatedAt);
      }
      if (sort === "due") {
        return (left.dueDate ?? "9999-12-31").localeCompare(
          right.dueDate ?? "9999-12-31"
        );
      }
      if (sort === "progress") {
        return right.progress - left.progress;
      }
      return left.name.localeCompare(right.name);
    });
  const employees = employeeResult.ok ? employeeResult.data : [];
  const membersById = new Map(
    employees.map((employee) => [employee.id, employee])
  );
  const isAdmin =
    session.kind === "authenticated" && session.user.role === "admin";
  return (
    <>
      <ErrorToast message={personal.ok ? null : personal.error.message} />
      <ErrorToast
        message={employeeResult.ok ? null : employeeResult.error.message}
      />
      <ProjectFilterBar filters={filters} />
      <ViewSwitchTransition name="project-layout" view={view}>
        {projects.length > 0 && view === "grid" ? (
          <ProjectGridView
            favorites={favoriteProjectIds}
            isAdmin={isAdmin}
            membersById={membersById}
            projects={projects}
          />
        ) : null}
        {projects.length > 0 && view === "table" ? (
          <ProjectTableView
            favorites={favoriteProjectIds}
            isAdmin={isAdmin}
            membersById={membersById}
            projects={projects}
          />
        ) : null}
      </ViewSwitchTransition>
      {projects.length === 0 ? (
        <section className="panel panel-b">
          <h2>
            {result.data.length ? "No matching projects" : "No projects yet"}
          </h2>
          <p className="muted">
            {result.data.length
              ? "Try changing your search or filters."
              : "An administrator can create the first project."}
          </p>
          {result.data.length > 0 ? (
            <WorkspaceButton asChild className="btn btn-secondary btn-sm">
              <Link href="/projects">Clear filters</Link>
            </WorkspaceButton>
          ) : null}
        </section>
      ) : null}
    </>
  );
};

const ProjectCounts = async () => {
  const projects = readOrThrow(await listAllProjects(), "Projects");
  const activeCount = projects.filter(
    (project) => project.status !== "complete"
  ).length;
  return `${activeCount} active · ${projects.length - activeCount} completed`;
};

// Only admins create projects; others see no action, so there is no space to
// hold.
const ProjectDirectoryActions = async () => {
  const session = await getPageSession();
  if (session.kind !== "authenticated" || session.user.role !== "admin") {
    return null;
  }
  return (
    <div className="acts">
      <ProjectCreateForm />
    </div>
  );
};

const PROJECT_CARDS = SKELETON_KEYS.slice(0, 3);

const PROJECT_TABLE_COLUMNS = [
  "Project",
  "Status",
  "Progress",
  "Tasks",
  "Due date",
  "Updated",
  "Members",
  "Favorite",
] as const;

const DEFAULT_FILTERS = {
  query: "",
  sort: "recent",
  status: "",
} as const satisfies Omit<ProjectFilters, "view">;

// Mirrors ProjectDirectory: the real filter bar and layout switch (inert, at
// their default values) above the layout ?view asks for.
const ProjectDirectorySkeleton = ({
  view,
}: {
  readonly view: ProjectFilters["view"];
}) => (
  <>
    <div aria-hidden="true" className="contents" inert>
      <ProjectFilterBar filters={{ ...DEFAULT_FILTERS, view }} />
    </div>
    {view === "table" ? (
      <div className="project-table-skeleton">
        <SkeletonDataGrid
          columns={PROJECT_TABLE_COLUMNS}
          label="Loading projects…"
          widths="minmax(180px, 2fr) repeat(7, minmax(60px, 1fr))"
        />
      </div>
    ) : (
      <SkelterSurface label="Loading projects…">
        <div className="pgrid">
          {PROJECT_CARDS.map((key) => (
            <ProjectCardSkeleton key={key} />
          ))}
        </div>
      </SkelterSurface>
    )}
  </>
);

export {
  ProjectCounts,
  ProjectDirectory,
  ProjectDirectoryActions,
  ProjectDirectorySkeleton,
};

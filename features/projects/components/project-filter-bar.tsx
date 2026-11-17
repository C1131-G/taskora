/* eslint-disable shadcn/no-unknown-classes, shadcn/no-restyle -- Workspace classes are defined in apps/web/app/workspace-styles. */

import Link from "next/link";

import { TabUnderline } from "@/components/ui/tab-underline";
import { WorkspaceButton } from "@/components/workspace/workspace-button";
import { WorkspaceInput } from "@/components/workspace/workspace-controls";
import {
  WorkspaceSelect,
  WorkspaceSelectItem,
} from "@/components/workspace/workspace-select";
import {
  projectHref,
  projectStatuses,
  projectViews,
  statusLabel,
} from "@/features/projects/project-filters";
import type { ProjectFilters } from "@/features/projects/project-filters";

// The Projects filter row and Grid/Table switch; the loading skeleton renders
// this same markup inert so both states share one layout.
const ProjectFilterBar = ({
  filters,
}: {
  readonly filters: ProjectFilters;
}) => {
  const { query, sort, status: selectedStatus, view } = filters;
  const filterValues = { q: query, sort, status: selectedStatus };
  return (
    <>
      <form className="toolbar project-toolbar" method="get">
        <label className="field project-search" htmlFor="projects-search">
          <span className="sr-only">Search projects</span>
          <WorkspaceInput
            autoComplete="off"
            className="input"
            defaultValue={query}
            id="projects-search"
            maxLength={120}
            name="q"
            placeholder="Search projects"
            type="search"
          />
        </label>
        <label className="field" htmlFor="projects-status">
          <span className="sr-only">Filter by status</span>
          <WorkspaceSelect
            ariaLabel="Filter by status"
            className="input"
            defaultValue={selectedStatus}
            id="projects-status"
            name="status"
          >
            <WorkspaceSelectItem value="">All statuses</WorkspaceSelectItem>
            {projectStatuses.map((status) => (
              <WorkspaceSelectItem key={status} value={status}>
                {statusLabel[status]}
              </WorkspaceSelectItem>
            ))}
          </WorkspaceSelect>
        </label>
        <label className="field" htmlFor="projects-sort">
          <span className="sr-only">Sort projects</span>
          <WorkspaceSelect
            ariaLabel="Sort projects"
            className="input"
            defaultValue={sort}
            id="projects-sort"
            name="sort"
          >
            <WorkspaceSelectItem value="recent">
              Recently active
            </WorkspaceSelectItem>
            <WorkspaceSelectItem value="name">Name</WorkspaceSelectItem>
            <WorkspaceSelectItem value="due">Due date</WorkspaceSelectItem>
            <WorkspaceSelectItem value="progress">Progress</WorkspaceSelectItem>
          </WorkspaceSelect>
        </label>
        <input name="view" type="hidden" value={view} />
        <WorkspaceButton className="btn btn-secondary" type="submit">
          Apply
        </WorkspaceButton>
      </form>
      <nav aria-label="Project layout" className="tabs project-view-tabs">
        {projectViews.map((layout) => (
          <Link
            aria-current={view === layout ? "page" : undefined}
            className={`tab${view === layout ? " on" : ""}`}
            href={projectHref(filterValues, layout)}
            key={layout}
          >
            {layout[0]?.toUpperCase()}
            {layout.slice(1)}
            {view === layout ? (
              <TabUnderline name="project-layout-tab" />
            ) : null}
          </Link>
        ))}
      </nav>
    </>
  );
};

export { ProjectFilterBar };

/* eslint-disable shadcn/no-restyle -- Skeletons reuse the real workspace button and input classes. */
/* eslint-disable shadcn/no-unknown-classes -- Workspace classes are defined in apps/web/app/workspace-styles. */

"use client";

import { useSearchParams } from "next/navigation";
import { Suspense } from "react";

import {
  SKELETON_KEYS,
  SkeletonBone,
} from "@/components/workspace/skeleton-shapes";
import { SkeletonRegion } from "@/components/workspace/skelter-surface";
import { WorkspaceButton } from "@/components/workspace/workspace-button";
import { WorkspaceInput } from "@/components/workspace/workspace-controls";

const PROJECT_ROWS = SKELETON_KEYS.slice(0, 2);
const TASK_ROWS = SKELETON_KEYS.slice(0, 5);

// A Suspense fallback cannot await searchParams, but the browser already has
// the URL: results panels are drawn only when a query is about to be run.
// Recent searches are left out, as they are not known until the data loads.
// Mirrors SearchForm: the search bar and result headings are static; the rows
// are data.
const SearchSkeletonLayout = ({ hasQuery }: { readonly hasQuery: boolean }) => (
  <SkeletonRegion label="Loading search…">
    <div className="stack">
      <search className="panel panel-b">
        <div className="row">
          <WorkspaceInput
            className="input grow"
            placeholder="Search projects and tasks"
            readOnly
            tabIndex={-1}
          />
          <WorkspaceButton className="btn btn-primary" type="button">
            Search
          </WorkspaceButton>
        </div>
      </search>
      {hasQuery ? (
        <div className="grid2">
          <section className="panel">
            <div className="panel-h">
              <h2>Projects</h2>
            </div>
            {PROJECT_ROWS.map((key) => (
              <div className="mini" key={key}>
                <SkeletonBone shape="line" width="22ch" />
              </div>
            ))}
          </section>
          <section className="panel">
            <div className="panel-h">
              <h2>Tasks</h2>
            </div>
            {TASK_ROWS.map((key) => (
              <div className="mini" key={key}>
                <span className="trunc grow">
                  <SkeletonBone shape="line" width="26ch" />
                </span>
                <span className="muted">
                  <SkeletonBone shape="line" width="14ch" />
                </span>
              </div>
            ))}
          </section>
        </div>
      ) : null}
    </div>
  </SkeletonRegion>
);

const UrlSearchSkeleton = () => (
  <SearchSkeletonLayout
    hasQuery={Boolean(useSearchParams().get("q")?.trim())}
  />
);

// The hook reads runtime data and a fallback sits outside the boundary it
// belongs to, so it gets its own boundary: the static shell draws the skeleton
// without results and the client swaps in the one the URL asks for.
const SearchPanelSkeleton = () => (
  <Suspense fallback={<SearchSkeletonLayout hasQuery={false} />}>
    <UrlSearchSkeleton />
  </Suspense>
);

export { SearchPanelSkeleton };

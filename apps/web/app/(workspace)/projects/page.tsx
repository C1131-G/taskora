/* eslint-disable shadcn/no-unknown-classes */

import type { Metadata } from "next";
import { Suspense } from "react";

import { PageTransition } from "@/components/ui/page-transition";
import { SectionErrorBoundary } from "@/components/ui/section-error-boundary";
import { SuspenseReveal } from "@/components/ui/suspense-reveal";
import { SkeletonBone } from "@/components/workspace/skeleton-shapes";
import {
  ProjectCounts,
  ProjectDirectory,
  ProjectDirectoryActions,
  ProjectDirectorySkeleton,
} from "@/features/projects/components/project-directory";
import { SearchParamFallback } from "@/features/projects/components/search-param-fallback";
import { parseProjectFilters } from "@/features/projects/project-filters";

export const metadata: Metadata = { title: "Projects | Taskora" };

// Old ?view=list links open the table, as parseProjectFilters does.
const tableSkeleton = <ProjectDirectorySkeleton view="table" />;

const ProjectsPage = ({ searchParams }: PageProps<"/projects">) => (
  <PageTransition>
    <div className="page">
      <div className="ph">
        <div>
          <h1>Projects</h1>
          <p>
            <Suspense
              fallback={
                <span aria-hidden="true" className="project-counts-skeleton">
                  <SkeletonBone />
                </span>
              }
            >
              <ProjectCounts />
            </Suspense>
          </p>
        </div>
        {/* Most people are not admins and never get this button, so no space
            is held for it while the role loads. */}
        <Suspense fallback={null}>
          <ProjectDirectoryActions />
        </Suspense>
      </div>
      <SectionErrorBoundary title="Projects couldn't load">
        <SuspenseReveal
          fallback={
            <SearchParamFallback
              cases={{ list: tableSkeleton, table: tableSkeleton }}
              fallback={<ProjectDirectorySkeleton view="grid" />}
              name="view"
            />
          }
        >
          {/* oxlint-disable-next-line promise/prefer-await-to-then -- The page stays synchronous so its chrome paints in the static shell. */}
          {searchParams.then((params) => (
            <ProjectDirectory filters={parseProjectFilters(params)} />
          ))}
        </SuspenseReveal>
      </SectionErrorBoundary>
    </div>
  </PageTransition>
);

export default ProjectsPage;

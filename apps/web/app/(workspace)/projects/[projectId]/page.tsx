/* eslint-disable shadcn/no-unknown-classes */

import type { Metadata } from "next";
import { connection } from "next/server";
import { Suspense } from "react";

import { PageTransition } from "@/components/ui/page-transition";
import { SectionErrorBoundary } from "@/components/ui/section-error-boundary";
import { SuspenseReveal } from "@/components/ui/suspense-reveal";
import {
  ProjectBody,
  ProjectHeader,
} from "@/features/projects/components/project-detail";
import { ProjectSkeletonFallback } from "@/features/projects/components/project-detail-skeleton";
import { parseProjectDetailQuery } from "@/features/projects/project-detail-params";
import { projectMetadata } from "@/features/projects/project-metadata";
import { parseTaskIdParam } from "@/features/tasks/task-param";

// The workspace shell's client provider prevents instant-navigation validation
// for this request-dependent project page.
export const instant = false;

const DynamicMetadataMarker = async () => {
  await connection();
  return null;
};

export const generateMetadata = async ({
  params,
}: PageProps<"/projects/[projectId]">): Promise<Metadata> => {
  const { projectId } = await params;
  return await projectMetadata(projectId);
};

const ProjectPage = ({
  params,
  searchParams,
}: PageProps<"/projects/[projectId]">) => {
  // oxlint-disable-next-line promise/prefer-await-to-then -- The page stays synchronous so its chrome paints in the static shell.
  const route = Promise.all([params, searchParams]).then(
    ([{ projectId }, query]) => ({
      initialTaskId: parseTaskIdParam(query["task"]),
      projectId,
      query: parseProjectDetailQuery(query),
    })
  );
  return (
    <PageTransition>
      <div className="page flush">
        <SectionErrorBoundary title="Project navigation couldn't load">
          <Suspense fallback={null}>
            <DynamicMetadataMarker />
          </Suspense>
        </SectionErrorBoundary>
        <SectionErrorBoundary title="Project details couldn't load" variant="page">
          <SuspenseReveal fallback={<ProjectSkeletonFallback part="header" />}>
            {/* oxlint-disable-next-line promise/prefer-await-to-then -- Route values resolve inside the boundary. */}
            {route.then(({ projectId, query }) => (
              <ProjectHeader projectId={projectId} requestedView={query.view} />
            ))}
          </SuspenseReveal>
        </SectionErrorBoundary>
        <SectionErrorBoundary title="This project view couldn't load">
          {/* Only the inner boundary reveals, so the body rises in once. The outer
              one waits on route values alone; null matches the delayed fallback
              the reveal shows first anyway. */}
          <Suspense fallback={null}>
            {/* oxlint-disable-next-line promise/prefer-await-to-then -- Route values resolve inside the boundary. */}
            {route.then(({ initialTaskId, projectId, query }) => (
              <SuspenseReveal fallback={<ProjectSkeletonFallback part="body" />}>
                <ProjectBody
                  initialTaskId={initialTaskId}
                  projectId={projectId}
                  query={query}
                />
              </SuspenseReveal>
            ))}
          </Suspense>
        </SectionErrorBoundary>
      </div>
    </PageTransition>
  );
};

export default ProjectPage;

import type { Metadata } from "next";

import { PageTransition } from "@/components/ui/page-transition";
import { SectionErrorBoundary } from "@/components/ui/section-error-boundary";
import { SuspenseReveal } from "@/components/ui/suspense-reveal";
import {
  WorkspaceHome,
  WorkspaceHomeSkeleton,
} from "@/features/dashboard/components/workspace-home";
import { parseHomeTaskView } from "@/features/dashboard/home-task-view";
import { SearchParamFallback } from "@/features/projects/components/search-param-fallback";

export const metadata: Metadata = { title: "Home | Taskora" };

const HomePage = ({ searchParams }: PageProps<"/">) => (
  <PageTransition>
    <SectionErrorBoundary title="Your workspace couldn't load" variant="page">
      <SuspenseReveal
        fallback={
          <SearchParamFallback
            cases={{
              completed: <WorkspaceHomeSkeleton taskView="completed" />,
              overdue: <WorkspaceHomeSkeleton taskView="overdue" />,
            }}
            fallback={<WorkspaceHomeSkeleton taskView="upcoming" />}
            name="taskView"
          />
        }
      >
        {/* oxlint-disable-next-line promise/prefer-await-to-then -- Resolve URL state at the route boundary while keeping the page synchronous. */}
        {searchParams.then((params) => (
          <WorkspaceHome taskView={parseHomeTaskView(params["taskView"])} />
        ))}
      </SuspenseReveal>
    </SectionErrorBoundary>
  </PageTransition>
);

export default HomePage;

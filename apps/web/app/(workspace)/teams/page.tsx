/* eslint-disable shadcn/no-unknown-classes */

import type { Metadata } from "next";
import { Suspense } from "react";

import { PageTransition } from "@/components/ui/page-transition";
import { SectionErrorBoundary } from "@/components/ui/section-error-boundary";
import { SuspenseReveal } from "@/components/ui/suspense-reveal";
import {
  TeamList,
  TeamListSkeleton,
  TeamsActions,
} from "@/features/people/components/team-list";

export const metadata: Metadata = { title: "Teams | Taskora" };

const TeamsPage = () => (
  <PageTransition>
    <div className="page">
      <div className="ph">
        <div>
          <h1>Teams</h1>
          <p>Organize employees by team.</p>
        </div>
        {/* Most people are not admins and never get this button, so no space
            is held for it while the role loads. */}
        <Suspense fallback={null}>
          <TeamsActions />
        </Suspense>
      </div>
      <SectionErrorBoundary title="Teams couldn't load">
        <SuspenseReveal fallback={<TeamListSkeleton />}>
          <TeamList />
        </SuspenseReveal>
      </SectionErrorBoundary>
    </div>
  </PageTransition>
);

export default TeamsPage;

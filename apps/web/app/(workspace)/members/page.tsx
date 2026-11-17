/* eslint-disable shadcn/no-unknown-classes */

import type { Metadata } from "next";
import { Suspense } from "react";

import { PageTransition } from "@/components/ui/page-transition";
import { SectionErrorBoundary } from "@/components/ui/section-error-boundary";
import { SuspenseReveal } from "@/components/ui/suspense-reveal";
import { SkeletonBone } from "@/components/workspace/skeleton-shapes";
import {
  MembersActions,
  MembersCount,
  MembersSection,
  MembersSectionSkeleton,
} from "@/features/people/components/members-section";
import { parseMembersSection } from "@/features/people/members-section-param";
import { SearchParamFallback } from "@/features/projects/components/search-param-fallback";

export const metadata: Metadata = { title: "Members | Taskora" };

const MembersPage = ({ searchParams }: PageProps<"/members">) => (
  <PageTransition>
    <div className="page">
      <div className="ph">
        <div>
          <h1>Members</h1>
          <p>
            <Suspense fallback={<SkeletonBone shape="line" width="26ch" />}>
              <MembersCount />
            </Suspense>
          </p>
        </div>
        {/* Most people are not admins and never get this button, so no space
            is held for it while the role loads; it never changes the row height. */}
        <Suspense fallback={null}>
          <MembersActions />
        </Suspense>
      </div>
      <SectionErrorBoundary title="Members couldn't load">
        <SuspenseReveal
          fallback={
            <SearchParamFallback
              cases={{ roles: <MembersSectionSkeleton section="roles" /> }}
              fallback={<MembersSectionSkeleton section="members" />}
              name="section"
            />
          }
        >
          {/* oxlint-disable-next-line promise/prefer-await-to-then -- The page stays synchronous so its chrome paints in the static shell. */}
          {searchParams.then((params) => (
            <MembersSection section={parseMembersSection(params["section"])} />
          ))}
        </SuspenseReveal>
      </SectionErrorBoundary>
    </div>
  </PageTransition>
);

export default MembersPage;

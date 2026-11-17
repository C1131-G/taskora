/* eslint-disable shadcn/no-unknown-classes */

import type { Metadata } from "next";

import { PageTransition } from "@/components/ui/page-transition";
import { SectionErrorBoundary } from "@/components/ui/section-error-boundary";
import { SuspenseReveal } from "@/components/ui/suspense-reveal";
import {
  InboxFeed,
  InboxFeedSkeleton,
} from "@/features/notifications/components/inbox-feed";

export const metadata: Metadata = { title: "Inbox | Taskora" };

const InboxPage = () => (
  <PageTransition>
    <div className="page">
      <div className="ph">
        <div>
          <h1>Inbox</h1>
        </div>
      </div>
      <SectionErrorBoundary title="Inbox couldn't load">
        <SuspenseReveal fallback={<InboxFeedSkeleton />}>
          <InboxFeed />
        </SuspenseReveal>
      </SectionErrorBoundary>
    </div>
  </PageTransition>
);

export default InboxPage;

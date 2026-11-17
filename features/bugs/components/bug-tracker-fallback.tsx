"use client";

import { useSearchParams } from "next/navigation";
import { Suspense } from "react";

import { parseBugFilters } from "@/features/bugs/bug-filters";
import { BugTrackerSkeleton } from "@/features/bugs/components/bug-tracker-skeleton";

const UrlBugTrackerSkeleton = () => (
  <BugTrackerSkeleton
    filters={parseBugFilters(Object.fromEntries(useSearchParams().entries()))}
  />
);

// A Suspense fallback cannot await searchParams, but the browser already has
// the URL: draw the skeleton for the filters and view the page is about to show.
// The hook sits in its own boundary (a fallback is outside its boundary, so a
// bare hook would block prerendering); the default skeleton covers the shell.
const BugTrackerFallback = () => (
  <Suspense fallback={<BugTrackerSkeleton filters={parseBugFilters({})} />}>
    <UrlBugTrackerSkeleton />
  </Suspense>
);

export { BugTrackerFallback };

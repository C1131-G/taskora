/* eslint-disable shadcn/no-unknown-classes -- Skeletons use workspace styles. */

"use client";

import type { ReactNode } from "react";
import { SkeletonIgnore, withSkeleton } from "react-zero-skeleton";

const SkeletonLayout = ({ children }: { readonly children: ReactNode }) => (
  <div className="skeleton-layout">{children}</div>
);

const MeasuredSkeleton = withSkeleton(SkeletonLayout);

// CSS bones remain visible in server HTML while Skelter measures the layout.
// Suspense fallbacks must not depend on hydration for their first frame.
const SkelterSurface = ({
  children,
  label,
}: {
  readonly children: ReactNode;
  readonly label: string;
}) => (
  <output aria-busy="true" aria-label={label} className="skelter-surface">
    <span className="sr-only">{label}</span>
    <div aria-hidden="true" inert>
      <MeasuredSkeleton
        isLoadingSkeleton
        skeletonConfig={{
          animation: "wave",
          color: "var(--surface-3)",
          enter: "none",
          exit: "none",
          highlightColor: "var(--surface-2)",
        }}
      >
        {children}
      </MeasuredSkeleton>
    </div>
  </output>
);

// For skeletons built from the real markup (tables, labelled stats, forms):
// Skelter would draw a bone over every span, th and td, so the bones placed in
// the markup are the whole skeleton and the static labels stay as they are.
const SkeletonRegion = ({
  children,
  label,
}: {
  readonly children: ReactNode;
  readonly label: string;
}) => (
  <output aria-busy="true" aria-label={label} className="skelter-surface">
    <span className="sr-only">{label}</span>
    <div aria-hidden="true" className="skeleton-layout" inert>
      {children}
    </div>
  </output>
);

// Static chrome (headings, column titles) stays readable inside a skeleton.
const SkeletonKeep = SkeletonIgnore;

export { SkeletonKeep, SkeletonRegion, SkelterSurface };

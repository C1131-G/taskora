/* eslint-disable shadcn/no-unknown-classes -- Portal pages reuse the workspace stylesheet classes. */

import {
  SKELETON_KEYS,
  SkeletonBone,
} from "@/components/workspace/skeleton-shapes";
import {
  SkeletonKeep,
  SkelterSurface,
} from "@/components/workspace/skelter-surface";

export const PortalBugViewSkeleton = () => (
  <SkelterSurface label="Loading bug">
    <div className="portal-detail">
      <span className="portal-back">
        <SkeletonKeep>Company bugs</SkeletonKeep>
      </span>
      <header className="portal-bug-head">
        <SkeletonBone shape="short" />
        <h1>
          <SkeletonBone />
        </h1>
        <div className="portal-bug-meta">
          <SkeletonBone shape="short" />
          <SkeletonBone shape="short" />
          <SkeletonBone shape="short" />
        </div>
      </header>
      <div className="portal-detail-grid">
        <div className="portal-detail-main">
          {[
            "Description",
            "Steps to reproduce",
            "Expected and actual behavior",
          ].map((title) => (
            <section className="panel portal-panel" key={title}>
              <SkeletonKeep>
                <h2 className="sec">{title}</h2>
              </SkeletonKeep>
              <SkeletonBone />
              <SkeletonBone />
            </section>
          ))}
        </div>
        <aside className="portal-detail-side">
          <section className="panel portal-panel">
            <SkeletonKeep>
              <h2 className="sec">Status timeline</h2>
            </SkeletonKeep>
            <ol className="portal-timeline">
              {SKELETON_KEYS.slice(0, 3).map((key) => (
                <li key={key}>
                  <SkeletonBone />
                  <SkeletonBone shape="short" />
                </li>
              ))}
            </ol>
          </section>
        </aside>
      </div>
    </div>
  </SkelterSurface>
);

// Holds the notice's line while response times load.
export const PortalResponseNoticeSkeleton = () => (
  <span
    aria-hidden="true"
    className="portal-notice portal-response-note portal-response-pending"
  />
);

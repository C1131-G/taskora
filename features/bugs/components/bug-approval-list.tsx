/* eslint-disable shadcn/no-unknown-classes -- Bug screens use apps/web/app/workspace-styles. */

import { SealCheck } from "@phosphor-icons/react/dist/ssr";
import { redirect } from "next/navigation";

import { EmptyState } from "@/components/workspace/empty-state";
import { ErrorToast } from "@/components/workspace/error-toast";
import {
  SKELETON_KEYS,
  SkeletonBone,
} from "@/components/workspace/skeleton-shapes";
import { SkeletonRegion } from "@/components/workspace/skelter-surface";
import { listBugs } from "@/features/bugs/bugs-queries";
import { BugList } from "@/features/bugs/components/bug-list";
import { getPageSession } from "@/src/server/auth/page-session";

const BugApprovalList = async () => {
  const session = await getPageSession();
  if (session.kind !== "authenticated" || session.user.role !== "admin") {
    redirect("/bugs");
  }
  const result = await listBugs({ status: "awaiting_admin_approval" });
  if (!result.ok) {
    return <ErrorToast message="The approval inbox could not be loaded." />;
  }
  if (result.data.length === 0) {
    return (
      <EmptyState
        description="Verified fixes show up here for your sign-off. Nothing is waiting right now."
        headingLevel={2}
        icon={SealCheck}
        size="panel"
        title="All caught up"
      />
    );
  }
  return (
    <>
      <p className="approval-summary">
        <strong>{result.data.length}</strong>{" "}
        {result.data.length === 1 ? "fix is" : "fixes are"} waiting for your
        review
      </p>
      <BugList bugs={result.data} emptyMessage="" />
    </>
  );
};

// Mirrors the summary line and BugCard (title row, context line, meta row).
// Most queues hold one or two fixes, so two cards stand in for the list.
const BugApprovalListSkeleton = () => (
  <SkeletonRegion label="Loading approvals…">
    <p className="approval-summary">
      <SkeletonBone shape="line" width="16em" />
    </p>
    <div className="bug-list">
      {SKELETON_KEYS.slice(0, 2).map((key) => (
        <article className="panel panel-b bug-list-item" key={key}>
          <div className="bug-list-link">
            <span className="bug-severity" />
            <div className="bug-list-main">
              <div className="bug-list-title-row">
                <span className="bug-task-key">
                  <SkeletonBone shape="line" width="5em" />
                </span>
                <h2>
                  <SkeletonBone shape="line" width="14em" />
                </h2>
              </div>
              <p className="bug-list-context">
                <SkeletonBone shape="line" width="18em" />
              </p>
              <div className="bug-list-meta">
                <span>
                  <SkeletonBone shape="line" width="4em" />
                </span>
                <span>
                  <SkeletonBone shape="line" width="6em" />
                </span>
              </div>
            </div>
          </div>
        </article>
      ))}
    </div>
  </SkeletonRegion>
);

export { BugApprovalList, BugApprovalListSkeleton };

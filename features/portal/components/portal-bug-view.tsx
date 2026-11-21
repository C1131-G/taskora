/* eslint-disable shadcn/no-unknown-classes -- Portal pages reuse the workspace stylesheet classes. */

import { ArrowLeft } from "@phosphor-icons/react/dist/ssr";
import Link from "next/link";
import type { ReactNode } from "react";

import {
  SKELETON_KEYS,
  SkeletonBone,
} from "@/components/workspace/skeleton-shapes";
import {
  SkeletonKeep,
  SkelterSurface,
} from "@/components/workspace/skelter-surface";
import { clientStatusText } from "@/features/portal/client-status";
import { PortalAttachments } from "@/features/portal/components/portal-attachments";
import { PortalBugManage } from "@/features/portal/components/portal-bug-manage";
import { PortalComments } from "@/features/portal/components/portal-comments";
import { PortalStatusChip } from "@/features/portal/components/portal-status-chip";
import { PortalTime } from "@/features/portal/components/portal-time";
import { getPortalCompany } from "@/features/portal/portal-company";
import { impactText } from "@/features/portal/portal-format";
import {
  getPortalBugRecord,
  getPortalFilePreviewUrl,
} from "@/features/portal/portal-queries";
import type { PortalBugDetail } from "@/src/server/portal/portal-contracts";

import { BugSections, PortalBugNotices } from "./portal-bug-sections";

const isImageAttachment = (
  attachment: PortalBugDetail["attachments"][number]
) => attachment.previewable && attachment.contentType.startsWith("image/");

// Image previews are signed with the page, keyed by file id; a failed signature
// reads as an unavailable preview.
const signImagePreviews = async (
  attachments: PortalBugDetail["attachments"]
): Promise<Readonly<Record<string, string | null>>> => {
  const images = attachments.filter(isImageAttachment);
  const results = await Promise.all(
    images.map(({ fileId }) => getPortalFilePreviewUrl(fileId))
  );
  return Object.fromEntries(
    images.map(({ fileId }, index) => {
      const result = results[index];
      return [fileId, result?.ok ? result.data : null];
    })
  );
};

// The page owns the response-notice boundary and hands it in as a slot; it
// shows only while the bug still awaits a first response.
const PortalBugView = async ({
  bugId,
  responseNotice,
}: {
  readonly bugId: string;
  readonly responseNotice: ReactNode;
}) => {
  const [record, company] = await Promise.all([
    getPortalBugRecord(bugId),
    getPortalCompany(),
  ]);
  const isPreview = Boolean(company?.preview);
  // Preview is read only: every capability the server reports is turned off
  // so no mutating control renders. The server refuses these actions anyway.
  const bug: PortalBugDetail = isPreview
    ? {
        ...record,
        canAttach: false,
        canComment: false,
        canEdit: false,
        canWithdraw: false,
        lifecycle: {
          ...record.lifecycle,
          canRate: false,
          canReportAgain: false,
        },
      }
    : record;
  const previewUrls = await signImagePreviews(bug.attachments);
  return (
    <div className="portal-detail">
      <Link
        className="portal-back"
        href="/portal"
        transitionTypes={["nav-back"]}
      >
        <ArrowLeft aria-hidden="true" size={14} />
        Company bugs
      </Link>
      <header className="portal-bug-head">
        <p className="portal-bug-key">{bug.key}</p>
        <h1>{bug.title}</h1>
        <div className="portal-bug-meta">
          <PortalStatusChip status={bug.status} />
          <span>{bug.projectName}</span>
          {bug.impact ? <span>Impact: {impactText[bug.impact]}</span> : null}
          <span>
            Reported by {bug.isMine ? "you" : bug.reporterName} on{" "}
            <PortalTime iso={bug.createdAt} variant="date" />
          </span>
          <span>
            Updated <PortalTime iso={bug.updatedAt} />
          </span>
        </div>
      </header>
      <PortalBugNotices
        bug={bug}
        isPreview={isPreview}
        responseNotice={responseNotice}
      />
      <div className="portal-detail-grid">
        <div className="portal-detail-main">
          <PortalBugManage bug={bug}>
            <BugSections bug={bug} />
          </PortalBugManage>
          <PortalAttachments
            attachments={bug.attachments}
            bugId={bug.id}
            canAttach={bug.canAttach}
            previewUrls={previewUrls}
          />
          <PortalComments
            bugId={bug.id}
            canComment={bug.canComment}
            comments={bug.comments}
          />
        </div>
        <aside aria-label="Status history" className="portal-detail-side">
          <section className="panel portal-panel">
            <h2 className="sec">Status timeline</h2>
            <ol className="portal-timeline">
              {bug.timeline.map((entry) => (
                <li key={`${entry.status}-${entry.at}`}>
                  <strong>{clientStatusText[entry.status]}</strong>
                  <span className="faint">
                    <PortalTime iso={entry.at} />
                  </span>
                </li>
              ))}
            </ol>
          </section>
        </aside>
      </div>
    </div>
  );
};

const PortalBugViewSkeleton = () => (
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

export { PortalBugView, PortalBugViewSkeleton };

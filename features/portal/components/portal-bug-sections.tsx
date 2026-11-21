/* eslint-disable shadcn/no-unknown-classes -- Portal pages reuse the workspace stylesheet classes. */

import type { ReactNode } from "react";

import { ErrorToast } from "@/components/workspace/error-toast";
import { PortalLifecycleBanner } from "@/features/portal/components/portal-lifecycle";
import { hasLifecycleBanner } from "@/features/portal/lifecycle-state";
import {
  getPortalBugRecord,
  getPortalResponseTimes,
} from "@/features/portal/portal-queries";
import { usuallyRespondText } from "@/features/portal/portal-response-time";
import type { PortalBugDetail } from "@/src/server/portal/portal-contracts";

const isHttpUrl = (value: string) => {
  try {
    const { protocol } = new URL(value);
    return protocol === "http:" || protocol === "https:";
  } catch {
    return false;
  }
};

const readOnlyMessage = (bug: PortalBugDetail) => {
  if (bug.status === "withdrawn") {
    return "This bug was withdrawn. It can no longer be edited.";
  }
  if (bug.canComment) {
    return "This bug can no longer be edited because the team has started on it. You can still add comments and attachments.";
  }
  return "This bug is closed and read-only. You can still read everything about it.";
};

export const BugSections = ({ bug }: { readonly bug: PortalBugDetail }) => {
  const environment = [
    ["Browser", bug.browser],
    ["Device", bug.device],
    ["Operating system", bug.os],
  ] as const;
  return (
    <>
      {bug.description ? (
        <section aria-labelledby="portal-desc-h" className="panel portal-panel">
          <h2 className="sec" id="portal-desc-h">
            Description
          </h2>
          <p className="portal-prose">{bug.description}</p>
        </section>
      ) : null}
      <section aria-labelledby="portal-steps-h" className="panel portal-panel">
        <h2 className="sec" id="portal-steps-h">
          Steps to reproduce
        </h2>
        <ol className="portal-step-list">
          {bug.reproductionSteps.map((step, index) => (
            // Steps are plain text in a fixed order, so position identifies one.
            // eslint-disable-next-line react/no-array-index-key
            <li key={`${index}-${step}`}>{step}</li>
          ))}
        </ol>
      </section>
      <section
        aria-labelledby="portal-behavior-h"
        className="panel portal-panel"
      >
        <h2 className="sec" id="portal-behavior-h">
          Expected and actual behavior
        </h2>
        <div className="portal-two">
          <div>
            <h3 className="sub">Expected</h3>
            <p className="portal-prose">{bug.expectedBehavior}</p>
          </div>
          <div>
            <h3 className="sub">Actual</h3>
            <p className="portal-prose">{bug.actualBehavior}</p>
          </div>
        </div>
      </section>
      <section aria-labelledby="portal-where-h" className="panel portal-panel">
        <h2 className="sec" id="portal-where-h">
          Where it happened
        </h2>
        <dl className="portal-facts">
          <div>
            <dt>Page URL</dt>
            <dd>
              {isHttpUrl(bug.pageUrl) ? (
                <a
                  className="portal-link"
                  href={bug.pageUrl}
                  rel="noreferrer noopener"
                  target="_blank"
                >
                  {bug.pageUrl}
                </a>
              ) : (
                bug.pageUrl
              )}
            </dd>
          </div>
          {environment.map(([label, value]) => (
            <div key={label}>
              <dt>{label}</dt>
              <dd>{value || "Not provided"}</dd>
            </div>
          ))}
        </dl>
      </section>
    </>
  );
};

export const PortalResponseNotice = async ({
  bugId,
}: {
  readonly bugId: string;
}) => {
  const bug = await getPortalBugRecord(bugId);
  if (bug.firstResponse.targetMinutes === null) {
    return null;
  }
  const times = await getPortalResponseTimes({});
  if (!times.ok) {
    return <ErrorToast message={times.error.message} />;
  }
  return (
    <output className="portal-notice portal-response-note">
      {usuallyRespondText(bug.firstResponse.targetMinutes, times.data)}
    </output>
  );
};

export const PortalBugNotices = ({
  bug,
  isPreview,
  responseNotice,
}: {
  readonly bug: PortalBugDetail;
  readonly isPreview: boolean;
  readonly responseNotice: ReactNode;
}) => {
  const showReadOnlyNotice =
    !bug.canEdit &&
    !isPreview &&
    !bug.readOnlyReason &&
    !hasLifecycleBanner(bug);
  const awaitingResponse =
    (bug.status === "submitted" || bug.status === "acknowledged") &&
    bug.firstResponse.respondedAt === null &&
    bug.firstResponse.targetMinutes !== null;
  return (
    <>
      {bug.readOnlyReason && !isPreview ? (
        <p className="portal-banner" role="note">
          {bug.readOnlyReason}
        </p>
      ) : null}
      {showReadOnlyNotice ? (
        <p className="portal-banner" role="note">
          {readOnlyMessage(bug)}
        </p>
      ) : null}
      {isPreview ? (
        <p className="portal-banner" role="note">
          Editing, comments, attachments and replies are disabled in preview.
        </p>
      ) : null}
      <PortalLifecycleBanner bug={bug} isPreview={isPreview} />
      {awaitingResponse ? responseNotice : null}
    </>
  );
};

// Holds the notice's line while response times load.
export const PortalResponseNoticeSkeleton = () => (
  <span
    aria-hidden="true"
    className="portal-notice portal-response-note portal-response-pending"
  />
);

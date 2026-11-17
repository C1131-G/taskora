/* eslint-disable shadcn/no-unknown-classes -- Workspace page classes are authored in apps/web/app/workspace-styles. */

import { ArrowLeft } from "@phosphor-icons/react/dist/ssr";
import Link from "next/link";
import { notFound } from "next/navigation";

import {
  SKELETON_KEYS,
  SkeletonBone,
} from "@/components/workspace/skeleton-shapes";
import { getBugRecord } from "@/features/bugs/bugs-queries";
import { BugDetailWorkflow } from "@/features/bugs/components/bug-detail-workflow";
import { BugWorkflowProgress } from "@/features/bugs/components/bug-workflow-progress";
import { listAllEmployees } from "@/features/people/people-queries";
import { getPageSession } from "@/src/server/auth/page-session";

const BugDetail = async ({ bugId }: { readonly bugId: string }) => {
  const [session, employeesResult, history] = await Promise.all([
    getPageSession(),
    listAllEmployees(),
    getBugRecord(bugId),
  ]);
  if (session.kind !== "authenticated") {
    notFound();
  }
  return (
    <BugDetailWorkflow
      employees={
        employeesResult.ok
          ? employeesResult.data.map(({ id, name }) => ({ id, name }))
          : []
      }
      history={history}
      isAdmin={session.user.role === "admin"}
      key={`${history.bug.id}:${history.bug.version}`}
      userId={session.user.id}
    />
  );
};

const CLIENT_FACTS = [
  "Company",
  "Client impact",
  "First response",
  "Resolution",
] as const;

const DISCOVERY_FACTS = [
  "Found by",
  "Environment",
  "Browser / device",
  "Reporter",
] as const;

const STEP_LINES = SKELETON_KEYS.slice(0, 2);

// Mirrors BugDetailWorkflow with the real elements, so every line box keeps its
// real height: the back link, workflow steps, section titles and fact labels are
// static; the bug's title, meta and every value are bones. The client section is
// kept because new client reports lead the bug list, which links here.
const BugDetailSkeleton = () => (
  <output
    aria-busy="true"
    aria-label="Loading bug details…"
    className="page bug-detail-page"
  >
    <span className="sr-only">Loading bug details…</span>
    <Link className="bug-back-link" href="/bugs" transitionTypes={["nav-back"]}>
      <ArrowLeft aria-hidden="true" size={15} /> Bugs
    </Link>
    <header className="bug-detail-header">
      <div className="bug-detail-heading">
        <p className="eyebrow">
          <SkeletonBone shape="short" />
        </p>
        <h1>
          <SkeletonBone />
        </h1>
        <p className="muted">
          <SkeletonBone />
        </p>
      </div>
      <div className="bug-detail-header-actions">
        <span className="bug-workflow-status">
          <SkeletonBone shape="short" />
        </span>
      </div>
    </header>
    {/* The step labels are static; no step is marked current until the bug loads. */}
    <div aria-hidden="true" className="bug-flow-skeleton" inert>
      <BugWorkflowProgress status="reported" />
    </div>
    <section className="panel panel-b bug-detail-section bug-client-section">
      <h2>Client report</h2>
      <dl className="bug-client-facts">
        {CLIENT_FACTS.map((label) => (
          <div key={label}>
            <dt>{label}</dt>
            <dd>
              <SkeletonBone shape="short" />
            </dd>
          </div>
        ))}
      </dl>
    </section>
    <section className="panel panel-b bug-detail-section">
      <header>
        <h2>Discovery report</h2>
        <span className="bug-severity-label">
          <SkeletonBone shape="short" />
        </span>
      </header>
      <div className="bug-detail-facts">
        {DISCOVERY_FACTS.map((label) => (
          <p key={label}>
            <strong>{label}</strong>
            <span>
              <SkeletonBone shape="short" />
            </span>
          </p>
        ))}
      </div>
      <div className="bug-report-detail-grid">
        <div>
          <h3>Reproduction steps</h3>
          <ol>
            {STEP_LINES.map((key) => (
              <li key={key}>
                <SkeletonBone />
              </li>
            ))}
          </ol>
        </div>
        <div>
          <h3>Expected</h3>
          <p>
            <SkeletonBone />
          </p>
          <h3>Actual</h3>
          <p>
            <SkeletonBone />
          </p>
        </div>
      </div>
    </section>
  </output>
);

export { BugDetail, BugDetailSkeleton };

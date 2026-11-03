/* eslint-disable shadcn/no-unknown-classes -- Bug views use reference workspace CSS classes. */

import { Check } from "@phosphor-icons/react/dist/ssr";

import type { BugHistory } from "./bug-detail-labels";

const STAGES = [
  "Reported",
  "Triage",
  "Fixing",
  "Verification",
  "Approval",
  "Released",
] as const;

// Where each status sits on the road from report to release.
const STAGE_OF: Readonly<Record<BugHistory["bug"]["status"], number>> = {
  approved_for_release: 4,
  awaiting_admin_approval: 4,
  awaiting_client: 2,
  closed: 5,
  duplicate: 5,
  in_progress: 2,
  in_verification: 3,
  needs_info: 1,
  rejected: 2,
  released: 5,
  reported: 0,
  triaged: 1,
  withdrawn: 5,
};

// A single line that shows how far the bug has come, so the long page below it
// reads as one path rather than a pile of unrelated sections.
export const BugWorkflowProgress = ({
  status,
}: {
  readonly status: BugHistory["bug"]["status"];
}) => {
  const current = STAGE_OF[status];
  return (
    <ol aria-label="Bug workflow" className="bug-flow">
      {STAGES.map((label, index) => (
        <li
          aria-current={index === current ? "step" : undefined}
          className={`bug-flow-step${index < current ? " is-done" : ""}${index === current ? " is-current" : ""}`}
          key={label}
        >
          <span aria-hidden="true" className="bug-flow-dot">
            {index < current ? <Check size={12} weight="bold" /> : index + 1}
          </span>
          <span className="bug-flow-label">{label}</span>
        </li>
      ))}
    </ol>
  );
};

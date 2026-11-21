/* eslint-disable shadcn/no-unknown-classes */
/* eslint-disable shadcn/no-restyle */

"use client";

import { useMemo, useState } from "react";
import { toast } from "sonner";

import { LocalTime } from "@/components/workspace/local-time";
import { WorkspaceButton } from "@/components/workspace/workspace-button";
import { WorkspaceConfirmDialog } from "@/components/workspace/workspace-confirm-dialog";
import {
  describeReason,
  describeRule,
  outcomeBadge,
} from "@/features/projects/automation-describe";
import type { Lookups } from "@/features/projects/automation-describe";
import {
  emptyRuleDraft,
  ruleToDraft,
} from "@/features/projects/automation-form";
import type { Option } from "@/features/projects/components/automation-option-helpers";
import { AutomationRuleForm } from "@/features/projects/components/automation-rule-form";
import {
  removeAutomationRuleAction,
  setAutomationRuleEnabledAction,
} from "@/features/projects/projects-automation-actions";
import { useToastTransition } from "@/hooks/use-toast-transition";
import { MAX_RULES_PER_PROJECT } from "@/src/server/automation/automation-contracts";
import type {
  AutomationRuleSummary,
  AutomationRunSummary,
} from "@/src/server/automation/automation-contracts";

type Editing = { readonly rule: AutomationRuleSummary | null } | null;

const RuleItem = ({
  lookups,
  onEdit,
  rule,
}: {
  readonly lookups: Lookups;
  readonly onEdit: () => void;
  readonly rule: AutomationRuleSummary;
}) => {
  const [pending, startTransition] = useToastTransition(
    "The automation could not be changed. Try again."
  );
  const described = describeRule(rule, lookups);

  const run = (
    task: () => Promise<{
      readonly ok: boolean;
      readonly error?: { readonly message: string };
    }>
  ) =>
    startTransition(async () => {
      const result = await task();
      if (!result.ok) {
        toast.error(result.error?.message ?? "Try again.");
      }
    });

  return (
    <li className="automation-rule" data-automation-rule={rule.id}>
      <div className="automation-rule-head">
        <strong>{rule.name}</strong>
        <span className={`badge ${rule.enabled ? "green" : "gray"}`}>
          {rule.enabled ? "Enabled" : "Disabled"}
        </span>
      </div>
      <p className="automation-when">
        <span className="automation-tag">When</span> {described.when}
        {described.conditions.length > 0 ? (
          <>
            {" "}
            <span className="automation-tag">If</span>{" "}
            {described.conditions.join(" and ")}
          </>
        ) : null}
      </p>
      <ol className="automation-then">
        {described.actions.map((action, index) => (
          // oxlint-disable-next-line react/no-array-index-key -- Actions are an ordered list without ids.
          <li key={`${index}-${action}`}>
            <span className="automation-tag">Then</span> {action}
          </li>
        ))}
      </ol>
      <div className="automation-actions">
        <WorkspaceButton
          aria-label={`${rule.enabled ? "Disable" : "Enable"} ${rule.name}`}
          className="btn btn-secondary btn-sm"
          disabled={pending}
          onClick={() =>
            run(() =>
              setAutomationRuleEnabledAction({
                enabled: !rule.enabled,
                idempotencyKey: crypto.randomUUID(),
                ruleId: rule.id,
              })
            )
          }
          type="button"
        >
          {rule.enabled ? "Disable" : "Enable"}
        </WorkspaceButton>
        <WorkspaceButton
          aria-label={`Edit ${rule.name}`}
          className="btn btn-secondary btn-sm"
          disabled={pending}
          onClick={onEdit}
          type="button"
        >
          Edit
        </WorkspaceButton>
        <WorkspaceConfirmDialog
          confirmLabel="Remove automation"
          description="The automation and its run log are deleted. Changes it already made stay."
          onConfirm={() =>
            run(() =>
              removeAutomationRuleAction({
                idempotencyKey: crypto.randomUUID(),
                ruleId: rule.id,
              })
            )
          }
          title={`Remove ${rule.name}?`}
        >
          <WorkspaceButton
            aria-label={`Remove ${rule.name}`}
            className="btn btn-danger-ghost btn-sm"
            disabled={pending}
            type="button"
          >
            Remove
          </WorkspaceButton>
        </WorkspaceConfirmDialog>
      </div>
    </li>
  );
};

const RunLog = ({
  runs,
}: {
  readonly runs: readonly AutomationRunSummary[];
}) => {
  if (runs.length === 0) {
    return <p className="automation-empty">No runs yet.</p>;
  }
  return (
    <table className="tbl automation-runs" data-automation-runs="true">
      <caption className="sr-only">Recent automation runs</caption>
      <thead>
        <tr>
          <th scope="col">When</th>
          <th scope="col">Automation</th>
          <th scope="col">Task</th>
          <th scope="col">Result</th>
          <th scope="col">Detail</th>
        </tr>
      </thead>
      <tbody>
        {runs.map((run) => {
          const badge = outcomeBadge(run.outcome);
          return (
            <tr key={run.id}>
              <td>
                <LocalTime value={run.createdAt} />
              </td>
              <td>{run.ruleName}</td>
              <td>{run.taskKey ?? "—"}</td>
              <td>
                <span className={`badge ${badge.tone}`}>{badge.label}</span>
              </td>
              <td className="muted">{describeReason(run.reason)}</td>
            </tr>
          );
        })}
      </tbody>
    </table>
  );
};

export const ProjectAutomations = ({
  labels,
  people,
  projectId,
  rules,
  runs,
}: {
  readonly labels: readonly Option[];
  readonly people: readonly Option[];
  readonly projectId: string;
  readonly rules: readonly AutomationRuleSummary[];
  readonly runs: readonly AutomationRunSummary[];
}) => {
  const [editing, setEditing] = useState<Editing>(null);
  const lookups = useMemo<Lookups>(
    () => ({
      labels: new Map(labels.map(({ id, label }) => [id, label])),
      people: new Map(people.map(({ id, label }) => [id, label])),
    }),
    [labels, people]
  );
  const atLimit = rules.length >= MAX_RULES_PER_PROJECT;

  return (
    <div className="stack" data-project-automations="true">
      <section aria-labelledby="automations-heading" className="panel">
        <div className="panel-h">
          <h2 id="automations-heading">Automations</h2>
          <p>
            When something happens to a task, do something about it. Only
            administrators see automations and their log; clients never do.
          </p>
        </div>
        <div className="panel-b stack">
          {editing ? (
            <AutomationRuleForm
              initial={
                editing.rule ? ruleToDraft(editing.rule) : emptyRuleDraft()
              }
              key={editing.rule?.id ?? "new"}
              labels={labels}
              onClose={() => setEditing(null)}
              people={people}
              projectId={projectId}
              {...(editing.rule
                ? {
                    rule: {
                      id: editing.rule.id,
                      version: editing.rule.version,
                    },
                  }
                : {})}
            />
          ) : (
            <div className="row">
              <WorkspaceButton
                className="btn btn-primary btn-sm"
                disabled={atLimit}
                onClick={() => setEditing({ rule: null })}
                type="button"
              >
                New automation
              </WorkspaceButton>
              {atLimit ? (
                <span className="muted">
                  This project has the maximum of {MAX_RULES_PER_PROJECT}{" "}
                  automations.
                </span>
              ) : null}
            </div>
          )}
          {rules.length === 0 ? (
            <p className="automation-empty">No automations yet.</p>
          ) : (
            <ul className="automation-rules">
              {rules.map((rule) => (
                <RuleItem
                  key={rule.id}
                  lookups={lookups}
                  onEdit={() => setEditing({ rule })}
                  rule={rule}
                />
              ))}
            </ul>
          )}
        </div>
      </section>
      <section aria-labelledby="automation-log-heading" className="panel">
        <div className="panel-h">
          <h2 id="automation-log-heading">Run log</h2>
          <p>
            Recent runs, newest first. Older entries are removed automatically.
          </p>
        </div>
        <div className="panel-b">
          <RunLog runs={runs} />
        </div>
      </section>
    </div>
  );
};

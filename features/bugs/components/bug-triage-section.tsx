/* eslint-disable shadcn/no-unknown-classes -- Bug views use reference workspace CSS classes. */

"use client";

import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import {
  WorkspaceSelect,
  WorkspaceSelectItem,
} from "@/components/workspace/workspace-select";
import { triageBugAction } from "@/features/bugs/bugs-actions";

import type { BugHistory, BugSubmit } from "../bug-workflow-ui-shared";

export const BugTriageSection = ({
  employees,
  history,
  isAdmin,
  pending,
  submit,
}: {
  readonly employees: readonly { readonly id: string; readonly name: string }[];
  readonly history: BugHistory;
  readonly isAdmin: boolean;
  readonly pending: boolean;
  readonly submit: BugSubmit;
}) => {
  if (
    !isAdmin ||
    history.archived ||
    !["reported", "triaged"].includes(history.bug.status)
  ) {
    return null;
  }
  const assignedUserIds = new Set(history.assignees.map(({ id }) => id));
  return (
    <section className="panel panel-b bug-detail-section">
      <h2>Triage and assignment</h2>
      <form
        className="bug-inline-form"
        onSubmit={(event) =>
          submit(event, (formData) =>
            triageBugAction({
              assigneeIds: formData.getAll("assigneeIds").map(String),
              bugId: history.bug.id,
              expectedVersion: history.bug.version,
              priority: String(formData.get("priority") ?? "none"),
              severity: String(formData.get("severity") ?? "major"),
            })
          )
        }
      >
        <div className="bug-detail-facts">
          <div className="bug-form-field">
            <Label htmlFor="triage-severity">Severity</Label>
            <WorkspaceSelect
              defaultValue={history.bug.severity}
              name="severity"
              id="triage-severity"
            >
              <WorkspaceSelectItem value="blocker">Blocker</WorkspaceSelectItem>
              <WorkspaceSelectItem value="critical">
                Critical
              </WorkspaceSelectItem>
              <WorkspaceSelectItem value="major">Major</WorkspaceSelectItem>
              <WorkspaceSelectItem value="minor">Minor</WorkspaceSelectItem>
              <WorkspaceSelectItem value="trivial">Trivial</WorkspaceSelectItem>
            </WorkspaceSelect>
          </div>
          <div className="bug-form-field">
            <Label htmlFor="triage-priority">Priority</Label>
            <WorkspaceSelect
              defaultValue={history.priority}
              name="priority"
              id="triage-priority"
            >
              <WorkspaceSelectItem value="urgent">Urgent</WorkspaceSelectItem>
              <WorkspaceSelectItem value="high">High</WorkspaceSelectItem>
              <WorkspaceSelectItem value="medium">Medium</WorkspaceSelectItem>
              <WorkspaceSelectItem value="low">Low</WorkspaceSelectItem>
              <WorkspaceSelectItem value="none">None</WorkspaceSelectItem>
            </WorkspaceSelect>
          </div>
        </div>
        <fieldset className="bug-employee-picker">
          <legend>Assign employees</legend>
          {employees.map((employee) => (
            <label className="bug-employee-option" key={employee.id}>
              <Checkbox
                defaultChecked={assignedUserIds.has(employee.id)}
                name="assigneeIds"
                value={employee.id}
              />
              <span>{employee.name}</span>
            </label>
          ))}
        </fieldset>
        <Button disabled={pending} type="submit">
          Save triage
        </Button>
      </form>
    </section>
  );
};

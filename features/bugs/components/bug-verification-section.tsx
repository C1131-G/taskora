/* eslint-disable shadcn/no-unknown-classes -- Bug views use reference workspace CSS classes. */

"use client";

import { useState } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  WorkspaceSelect,
  WorkspaceSelectItem,
} from "@/components/workspace/workspace-select";
import { verifyBugFixAction } from "@/features/bugs/bugs-actions";

import type { BugHistory, BugSubmit } from "../bug-workflow-ui-shared";

export const BugVerificationSection = ({
  canEdit,
  history,
  isReadOnly,
  latestAttempt,
  pending,
  submit,
}: {
  readonly canEdit: boolean;
  readonly history: BugHistory;
  readonly isReadOnly: boolean;
  readonly latestAttempt: BugHistory["attempts"][number] | null;
  readonly pending: boolean;
  readonly submit: BugSubmit;
}) => {
  const [environment, setEnvironment] = useState("staging");
  const [verificationOutcome, setVerificationOutcome] = useState("passed");
  if (
    isReadOnly ||
    !canEdit ||
    history.bug.status !== "in_progress" ||
    !latestAttempt ||
    latestAttempt.verifiedAt
  ) {
    return null;
  }
  return (
    <section className="panel panel-b bug-detail-section">
      <h2>Verify fix</h2>
      <form
        className="bug-detail-form-grid"
        onSubmit={(event) =>
          submit(event, (formData) =>
            verifyBugFixAction({
              attemptId: latestAttempt.id,
              bugId: history.bug.id,
              expectedVersion: history.bug.version,
              notes: String(formData.get("verificationNotes") ?? ""),
              outcome: verificationOutcome,
              testedEnvironment: environment,
              testedVersion: String(formData.get("testedVersion") ?? ""),
            })
          )
        }
      >
        <div className="bug-form-field">
          <Label htmlFor="bug-tested-version">Tested version</Label>
          <Input id="bug-tested-version" name="testedVersion" required />
        </div>
        <div className="bug-form-field">
          <Label htmlFor="bug-test-env">Tested environment</Label>
          <WorkspaceSelect
            onValueChange={setEnvironment}
            value={environment}
            id="bug-test-env"
          >
            <WorkspaceSelectItem value="production">
              Production
            </WorkspaceSelectItem>
            <WorkspaceSelectItem value="staging">Staging</WorkspaceSelectItem>
            <WorkspaceSelectItem value="development">
              Development
            </WorkspaceSelectItem>
            <WorkspaceSelectItem value="test">Test</WorkspaceSelectItem>
            <WorkspaceSelectItem value="other">Other</WorkspaceSelectItem>
          </WorkspaceSelect>
        </div>
        <div className="bug-form-field">
          <Label htmlFor="bug-outcome">Verification result</Label>
          <WorkspaceSelect
            onValueChange={setVerificationOutcome}
            value={verificationOutcome}
            id="bug-outcome"
          >
            <WorkspaceSelectItem value="passed">Passed</WorkspaceSelectItem>
            <WorkspaceSelectItem value="failed">Failed</WorkspaceSelectItem>
          </WorkspaceSelect>
        </div>
        <div className="bug-form-field bug-form-wide">
          <Label htmlFor="bug-verification-notes">Verification notes</Label>
          <Textarea
            id="bug-verification-notes"
            name="verificationNotes"
            required
            rows={3}
          />
        </div>
        <Button disabled={pending} type="submit">
          Record verification
        </Button>
      </form>
    </section>
  );
};

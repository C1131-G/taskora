/* eslint-disable shadcn/no-restyle, shadcn/no-unknown-classes -- These workspace classes are defined in apps/web/app/workspace-styles to match the reference UI. */

import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  WorkspaceSelect,
  WorkspaceSelectItem,
} from "@/components/workspace/workspace-select";
import { BugEnvironmentFields } from "@/features/bugs/components/bug-report-fields";

export interface BugProjectOption {
  readonly id: string;
  readonly key: string;
  readonly name: string;
}

// First step: the title, the project and how serious the bug is.
export const BugSummaryFields = ({
  discoverySource,
  onDiscoverySourceChange,
  onProjectChange,
  onSeverityChange,
  projectId,
  projects,
  severity,
}: {
  readonly discoverySource: string;
  readonly onDiscoverySourceChange: (value: string) => void;
  readonly onProjectChange: (value: string) => void;
  readonly onSeverityChange: (value: string) => void;
  readonly projectId: string;
  readonly projects: readonly BugProjectOption[];
  readonly severity: string;
}) => (
  <>
    <div className="bug-form-field bug-form-wide">
      <Label htmlFor="bug-title">Title</Label>
      <Input
        autoFocus
        id="bug-title"
        maxLength={300}
        name="title"
        placeholder="A short summary of the problem"
        required
      />
    </div>
    <div className="bug-form-field">
      <Label htmlFor="bug-project">Project</Label>
      <WorkspaceSelect
        onValueChange={onProjectChange}
        value={projectId}
        ariaLabel="Project"
        id="bug-project"
        displayValue={projectId ? undefined : "Choose a project"}
      >
        {projects.map((project) => (
          <WorkspaceSelectItem key={project.id} value={project.id}>
            {project.key} · {project.name}
          </WorkspaceSelectItem>
        ))}
      </WorkspaceSelect>
    </div>
    <div className="bug-form-field">
      <Label htmlFor="bug-severity">Severity</Label>
      <WorkspaceSelect
        onValueChange={onSeverityChange}
        value={severity}
        ariaLabel="Severity"
        id="bug-severity"
      >
        <WorkspaceSelectItem value="blocker">Blocker</WorkspaceSelectItem>
        <WorkspaceSelectItem value="critical">Critical</WorkspaceSelectItem>
        <WorkspaceSelectItem value="major">Major</WorkspaceSelectItem>
        <WorkspaceSelectItem value="minor">Minor</WorkspaceSelectItem>
        <WorkspaceSelectItem value="trivial">Trivial</WorkspaceSelectItem>
      </WorkspaceSelect>
    </div>
    <div className="bug-form-field bug-form-wide">
      <Label htmlFor="bug-source">Found by</Label>
      <WorkspaceSelect
        onValueChange={onDiscoverySourceChange}
        value={discoverySource}
        ariaLabel="Found by"
        id="bug-source"
      >
        <WorkspaceSelectItem value="employee_report">
          Employee report
        </WorkspaceSelectItem>
        <WorkspaceSelectItem value="internal_qa">
          Internal QA
        </WorkspaceSelectItem>
        <WorkspaceSelectItem value="customer_report">
          Customer report
        </WorkspaceSelectItem>
        <WorkspaceSelectItem value="support">Support</WorkspaceSelectItem>
        <WorkspaceSelectItem value="automated_test">
          Automated test
        </WorkspaceSelectItem>
        <WorkspaceSelectItem value="monitoring">Monitoring</WorkspaceSelectItem>
      </WorkspaceSelect>
    </div>
  </>
);

// Second step: where the bug showed up.
export const BugLocationFields = ({
  environment,
  onEnvironmentChange,
}: {
  readonly environment: string;
  readonly onEnvironmentChange: (value: string) => void;
}) => (
  <>
    <div className="bug-form-field">
      <Label htmlFor="bug-component">Page or component</Label>
      <Input id="bug-component" maxLength={500} name="component" required />
    </div>
    <div className="bug-form-field">
      <Label htmlFor="bug-route">URL or route</Label>
      <Input
        id="bug-route"
        maxLength={500}
        name="route"
        placeholder="/projects/…"
        required
      />
    </div>
    <div className="bug-form-field bug-form-wide">
      <Label htmlFor="bug-environment">Environment</Label>
      <WorkspaceSelect
        onValueChange={onEnvironmentChange}
        value={environment}
        ariaLabel="Environment"
        id="bug-environment"
      >
        <WorkspaceSelectItem value="production">Production</WorkspaceSelectItem>
        <WorkspaceSelectItem value="staging">Staging</WorkspaceSelectItem>
        <WorkspaceSelectItem value="development">
          Development
        </WorkspaceSelectItem>
        <WorkspaceSelectItem value="test">Test</WorkspaceSelectItem>
        <WorkspaceSelectItem value="other">Other</WorkspaceSelectItem>
      </WorkspaceSelect>
    </div>
    <BugEnvironmentFields />
  </>
);

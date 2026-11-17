/* eslint-disable shadcn/no-unknown-classes -- Bug views use reference workspace CSS classes. */

"use client";

/* eslint-disable shadcn/no-restyle, shadcn/no-unknown-classes -- These workspace classes are defined in apps/web/app/workspace-styles to match the reference UI. */

import {
  ArrowLeft,
  ArrowRight,
  Bug,
  Check,
  SpinnerGap,
} from "@phosphor-icons/react";
import { useRouter } from "next/navigation";
import { useRef, useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  WorkspaceSelect,
  WorkspaceSelectItem,
} from "@/components/workspace/workspace-select";
import { reportBugAction } from "@/features/bugs/bugs-actions";
import {
  BugEnvironmentFields,
  BugReproductionFields,
} from "@/features/bugs/components/bug-report-fields";
import { SimilarBugResults } from "@/features/bugs/components/bug-similar-results";
import { useBugSimilarSearch } from "@/features/bugs/hooks/use-bug-similar-search";

interface BugProjectOption {
  readonly id: string;
  readonly key: string;
  readonly name: string;
}

const STEPS = [
  {
    hint: "Give the bug a name and say how serious it is.",
    label: "What happened",
  },
  { hint: "Tell us where it showed up.", label: "Where it happened" },
  { hint: "Help someone else see the same thing.", label: "How to reproduce" },
] as const;

/* eslint-disable react-doctor/no-giant-component -- Wizard orchestration shares step validation and submission; field groups are separate components. */
export const BugReportDialog = ({
  initialProjectId,
  projects,
}: {
  readonly initialProjectId?: string;
  readonly projects: readonly BugProjectOption[];
}) => {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [step, setStep] = useState(0);
  const stepRefs = useRef<(HTMLElement | null)[]>([]);
  const [projectId, setProjectId] = useState(
    initialProjectId ?? projects[0]?.id ?? ""
  );
  const [severity, setSeverity] = useState("major");
  const [environment, setEnvironment] = useState("production");
  const [discoverySource, setDiscoverySource] = useState("employee_report");
  const { findSimilarBugs, searchingSimilar, similarBugs } =
    useBugSimilarSearch((message) => {
      if (message) {
        toast.error(message);
      }
    });

  // A step moves on only when its own required fields are filled in.
  const goNext = () => {
    const fields = stepRefs.current[step]?.querySelectorAll<
      HTMLInputElement | HTMLTextAreaElement
    >("input, textarea");
    for (const field of fields ?? []) {
      if (!field.reportValidity()) {
        return;
      }
    }
    setStep((current) => Math.min(current + 1, STEPS.length - 1));
  };

  const submit = async (formData: FormData) => {
    setBusy(true);
    const reproductionSteps = String(formData.get("reproductionSteps") ?? "")
      .split("\n")
      .map((line) => line.trim())
      .filter(Boolean);
    try {
      const result = await reportBugAction({
        actualBehavior: String(formData.get("actualBehavior") ?? ""),
        appVersion: String(formData.get("appVersion") ?? "") || null,
        browser: String(formData.get("browser") ?? "") || null,
        component: String(formData.get("component") ?? ""),
        description: String(formData.get("description") ?? "") || null,
        device: String(formData.get("device") ?? "") || null,
        discoverySource,
        environment,
        expectedBehavior: String(formData.get("expectedBehavior") ?? ""),
        idempotencyKey: crypto.randomUUID(),
        os: String(formData.get("os") ?? "") || null,
        projectId,
        reproductionSteps,
        route: String(formData.get("route") ?? ""),
        severity,
        title: String(formData.get("title") ?? ""),
      });
      if (result.ok === false) {
        toast.error(result.error.message);
      } else {
        setOpen(false);
        router.push(`/bugs/${result.data.id}`, {
          transitionTypes: ["nav-forward"],
        });
      }
    } catch {
      toast.error("The bug report could not be submitted. Please try again.");
    }
    setBusy(false);
  };

  return (
    <Dialog
      onOpenChange={(next) => {
        setOpen(next);
        if (next) {
          setStep(0);
        }
      }}
      open={open}
    >
      <DialogTrigger asChild>
        <Button disabled={projects.length === 0}>
          <Bug aria-hidden="true" size={16} />
          Report bug
        </Button>
      </DialogTrigger>
      <DialogContent className="workspace-app bug-report-dialog">
        <DialogHeader className="bug-dialog-head">
          <span aria-hidden="true" className="bug-dialog-icon">
            <Bug size={20} weight="duotone" />
          </span>
          <div className="bug-dialog-head-text">
            <DialogTitle>Report a bug</DialogTitle>
            <DialogDescription>
              Capture where you found the issue and how another person can
              reproduce it.
            </DialogDescription>
          </div>
        </DialogHeader>
        <ol aria-label="Report steps" className="bug-steps">
          {STEPS.map((item, index) => (
            <li
              aria-current={index === step ? "step" : undefined}
              className={`bug-step${index === step ? " is-current" : ""}${index < step ? " is-done" : ""}`}
              key={item.label}
            >
              <span aria-hidden="true" className="bug-step-dot">
                {index < step ? <Check size={13} weight="bold" /> : index + 1}
              </span>
              <span className="bug-step-label">{item.label}</span>
            </li>
          ))}
        </ol>
        <p className="bug-step-hint">
          Step {step + 1} of {STEPS.length}: {STEPS[step]?.hint}
        </p>
        <form
          action={submit}
          className="bug-report-form"
          onSubmit={(event) => {
            if (step < STEPS.length - 1) {
              event.preventDefault();
              goNext();
            }
          }}
        >
          <section
            className="bug-form-grid bug-step-panel"
            hidden={step !== 0}
            ref={(node) => {
              stepRefs.current[0] = node;
            }}
          >
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
                onValueChange={setProjectId}
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
                onValueChange={setSeverity}
                value={severity}
                ariaLabel="Severity"
                id="bug-severity"
              >
                <WorkspaceSelectItem value="blocker">
                  Blocker
                </WorkspaceSelectItem>
                <WorkspaceSelectItem value="critical">
                  Critical
                </WorkspaceSelectItem>
                <WorkspaceSelectItem value="major">Major</WorkspaceSelectItem>
                <WorkspaceSelectItem value="minor">Minor</WorkspaceSelectItem>
                <WorkspaceSelectItem value="trivial">
                  Trivial
                </WorkspaceSelectItem>
              </WorkspaceSelect>
            </div>
            <div className="bug-form-field bug-form-wide">
              <Label htmlFor="bug-source">Found by</Label>
              <WorkspaceSelect
                onValueChange={setDiscoverySource}
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
                <WorkspaceSelectItem value="support">
                  Support
                </WorkspaceSelectItem>
                <WorkspaceSelectItem value="automated_test">
                  Automated test
                </WorkspaceSelectItem>
                <WorkspaceSelectItem value="monitoring">
                  Monitoring
                </WorkspaceSelectItem>
              </WorkspaceSelect>
            </div>
          </section>
          <section
            className="bug-form-grid bug-step-panel"
            hidden={step !== 1}
            ref={(node) => {
              stepRefs.current[1] = node;
            }}
          >
            <div className="bug-form-field">
              <Label htmlFor="bug-component">Page or component</Label>
              <Input
                id="bug-component"
                maxLength={500}
                name="component"
                required
              />
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
                onValueChange={setEnvironment}
                value={environment}
                ariaLabel="Environment"
                id="bug-environment"
              >
                <WorkspaceSelectItem value="production">
                  Production
                </WorkspaceSelectItem>
                <WorkspaceSelectItem value="staging">
                  Staging
                </WorkspaceSelectItem>
                <WorkspaceSelectItem value="development">
                  Development
                </WorkspaceSelectItem>
                <WorkspaceSelectItem value="test">Test</WorkspaceSelectItem>
                <WorkspaceSelectItem value="other">Other</WorkspaceSelectItem>
              </WorkspaceSelect>
            </div>
            <BugEnvironmentFields />
          </section>
          <section
            className="bug-form-grid bug-step-panel"
            hidden={step !== 2}
            ref={(node) => {
              stepRefs.current[2] = node;
            }}
          >
            <BugReproductionFields />
            <div className="bug-form-field bug-form-wide bug-similar-search">
              <Button
                disabled={searchingSimilar}
                onClick={findSimilarBugs}
                type="button"
                variant="outline"
              >
                {searchingSimilar ? (
                  <SpinnerGap
                    aria-hidden="true"
                    className="animate-spin"
                    size={15}
                  />
                ) : null}
                Check for earlier reports
              </Button>
              <SimilarBugResults bugs={similarBugs} />
            </div>
          </section>
          <DialogFooter className="bug-step-footer">
            <Button
              disabled={busy}
              onClick={() => setOpen(false)}
              type="button"
              variant="ghost"
            >
              Cancel
            </Button>
            <span className="bug-step-spacer" />
            {step > 0 ? (
              <Button
                disabled={busy}
                onClick={() => setStep(step - 1)}
                type="button"
                variant="outline"
              >
                <ArrowLeft aria-hidden="true" size={15} />
                Back
              </Button>
            ) : null}
            {step < STEPS.length - 1 ? (
              <Button onClick={goNext} type="button">
                Next
                <ArrowRight aria-hidden="true" size={15} />
              </Button>
            ) : (
              <Button disabled={busy || !projectId} type="submit">
                {busy ? (
                  <SpinnerGap
                    aria-hidden="true"
                    className="animate-spin"
                    size={16}
                  />
                ) : null}
                Submit report
              </Button>
            )}
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};

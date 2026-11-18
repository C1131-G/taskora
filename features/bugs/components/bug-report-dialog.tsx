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
import { reportBugAction } from "@/features/bugs/bugs-actions";
import { BugReproductionFields } from "@/features/bugs/components/bug-report-fields";
import { bugReportInput } from "@/features/bugs/components/bug-report-input";
import {
  BugLocationFields,
  BugSummaryFields,
} from "@/features/bugs/components/bug-report-step-fields";
import type { BugProjectOption } from "@/features/bugs/components/bug-report-step-fields";
import { SimilarBugResults } from "@/features/bugs/components/bug-similar-results";
import { useBugSimilarSearch } from "@/features/bugs/hooks/use-bug-similar-search";

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
    try {
      const result = await reportBugAction(
        bugReportInput(formData, {
          discoverySource,
          environment,
          projectId,
          severity,
        })
      );
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
            <BugSummaryFields
              discoverySource={discoverySource}
              onDiscoverySourceChange={setDiscoverySource}
              onProjectChange={setProjectId}
              onSeverityChange={setSeverity}
              projectId={projectId}
              projects={projects}
              severity={severity}
            />
          </section>
          <section
            className="bug-form-grid bug-step-panel"
            hidden={step !== 1}
            ref={(node) => {
              stepRefs.current[1] = node;
            }}
          >
            <BugLocationFields
              environment={environment}
              onEnvironmentChange={setEnvironment}
            />
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

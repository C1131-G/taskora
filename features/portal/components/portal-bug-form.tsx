"use client";

/* eslint-disable shadcn/no-restyle -- Preserve established portal classes on shared controls. */

/* eslint-disable shadcn/no-unknown-classes -- Portal pages reuse the workspace stylesheet classes. */

import { useRouter } from "next/navigation";
import { useRef, useState } from "react";
import type { FormEvent } from "react";
import { toast } from "sonner";

import {
  PortalBugEditActions,
  PortalBugEditFields,
} from "@/features/portal/components/portal-bug-edit-fields";
import {
  FIELD_ORDER,
  LIMITS,
  validate,
  validateStep,
} from "@/features/portal/components/portal-bug-form-model";
import type {
  Errors,
  FieldKey,
  Values,
} from "@/features/portal/components/portal-bug-form-model";
import {
  createBug,
  editBug,
} from "@/features/portal/components/portal-bug-submit";
import {
  PortalReportWizardActions,
  PortalReportWizardNavigation,
  PortalReportWizardStage,
} from "@/features/portal/components/portal-report-wizard-stage";
import type { CapturedScreenshot } from "@/features/portal/components/portal-screenshot-capture";

import {
  initialValues,
  PORTAL_REPORT_STEPS,
  submitLabel,
} from "./portal-bug-form-mode";
import type { Mode } from "./portal-bug-form-mode";
import { usePortalReportContext } from "./use-portal-report-context";

// The report form and the edit form share every field. Reporting also takes
// screenshots, uploaded once the bug exists.
const PortalBugForm = ({ mode }: { readonly mode: Mode }) => {
  const router = useRouter();
  const [values, setValues] = useState<Values>(() => initialValues(mode));
  const [errors, setErrors] = useState<Errors>({});
  const [pending, setPending] = useState(false);
  const [progress, setProgress] = useState("");
  const [files, setFiles] = useState<File[]>([]);
  const [captured, setCaptured] = useState<CapturedScreenshot | null>(null);
  const [sendContext, setSendContext] = useState(true);
  const [activeStep, setActiveStep] = useState(0);
  const { context, detected } = usePortalReportContext();
  const stepCounter = useRef(values.steps.length);
  const keyRef = useRef<string | null>(null);
  const formRef = useRef<HTMLFormElement>(null);
  const stepHeadingRef = useRef<HTMLHeadingElement>(null);
  const isCreate = mode.kind === "create";
  // Moving between steps puts focus on the new step's heading once it renders.
  const goToStep = (step: number) => {
    if (step === activeStep) {
      return;
    }
    setActiveStep(step);
    requestAnimationFrame(() => {
      stepHeadingRef.current?.focus();
    });
  };

  // Changing anything starts a new attempt, so an old idempotency key is never
  // reused with different input.
  const patch = (changes: Partial<Values>) => {
    keyRef.current = null;
    setValues((current) => ({ ...current, ...changes }));
    setErrors((current) =>
      Object.fromEntries(
        Object.entries(current).filter(([key]) => !(key in changes))
      )
    );
  };

  const changeStep = (id: string, text: string) => {
    keyRef.current = null;
    setValues((current) => ({
      ...current,
      steps: current.steps.map((step) =>
        step.id === id ? { ...step, text } : step
      ),
    }));
    setErrors(({ steps: _steps, ...rest }) => rest);
  };

  const addStep = () => {
    if (values.steps.length >= LIMITS.steps) {
      return;
    }
    const id = `step-${stepCounter.current}`;
    stepCounter.current += 1;
    patch({ steps: [...values.steps, { id, text: "" }] });
    requestAnimationFrame(() => {
      formRef.current
        ?.querySelector<HTMLInputElement>(`[data-step-id="${id}"]`)
        ?.focus();
    });
  };

  const removeStep = (id: string) => {
    if (values.steps.length > 1) {
      patch({ steps: values.steps.filter((step) => step.id !== id) });
    }
  };

  const focusFirstError = (found: Errors) => {
    const first = FIELD_ORDER.find((key: FieldKey) => found[key]);
    if (first) {
      formRef.current
        ?.querySelector<HTMLElement>(`[data-field="${first}"]`)
        ?.focus();
    }
  };

  const continueToNextStep = () => {
    const stepErrors = validateStep(values, isCreate, activeStep);
    setErrors(stepErrors);
    if (Object.keys(stepErrors).length > 0) {
      toast.error(Object.values(stepErrors).filter(Boolean).join(" "));
      focusFirstError(stepErrors);
      return;
    }
    goToStep(Math.min(activeStep + 1, PORTAL_REPORT_STEPS.length - 1));
  };
  const createBugReport = async (idempotencyKey: string) => {
    const bugId = await createBug({
      captured,
      context,
      detected,
      files,
      idempotencyKey,
      onProgress: setProgress,
      recurrenceOfBugId:
        mode.kind === "create" ? mode.recurrenceOf?.id : undefined,
      sendContext,
      values,
    });
    if (bugId === null) {
      setPending(false);
      return;
    }
    // The report is filed; Back should not return to the finished form.
    router.replace(`/portal/bugs/${bugId}`, {
      transitionTypes: ["nav-forward"],
    });
  };

  const editBugReport = async (idempotencyKey: string) => {
    if (mode.kind !== "edit") {
      return;
    }
    const saved = await editBug({
      bug: mode.bug,
      detected,
      idempotencyKey,
      values,
    });
    if (saved) {
      mode.onDone();
    } else {
      setPending(false);
    }
  };

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const found = validate(values, isCreate);
    setErrors(found);
    if (Object.keys(found).length > 0) {
      toast.error(Object.values(found).filter(Boolean).join(" "));
      focusFirstError(found);
      return;
    }
    setPending(true);
    if (!keyRef.current) {
      keyRef.current = crypto.randomUUID();
    }
    try {
      await (isCreate
        ? createBugReport(keyRef.current)
        : editBugReport(keyRef.current));
    } catch {
      toast.error("Something went wrong. Check your connection and try again.");
      setPending(false);
    }
  };

  const handleCancel = () => {
    if (mode.kind === "edit") {
      mode.onCancel();
    }
  };

  return (
    <form
      aria-busy={pending}
      className={`portal-form${isCreate ? " portal-wizard" : ""}`}
      noValidate
      onSubmit={submit}
      ref={formRef}
    >
      {isCreate ? (
        <>
          <PortalReportWizardNavigation activeStep={activeStep} />
          <PortalReportWizardStage
            activeStep={activeStep}
            captured={captured}
            context={context}
            detected={detected}
            errors={errors}
            files={files}
            onAddStep={addStep}
            onCaptured={(next) => {
              keyRef.current = null;
              setCaptured(next);
            }}
            onFiles={setFiles}
            onPatch={patch}
            onRemoveStep={removeStep}
            onStepChange={changeStep}
            onToggleContext={(send) => {
              keyRef.current = null;
              setSendContext(send);
            }}
            pending={pending}
            projects={mode.projects}
            responseTimes={mode.responseTimes ?? null}
            sendContext={sendContext}
            stepHeadingRef={stepHeadingRef}
            values={values}
          />
        </>
      ) : (
        <PortalBugEditFields
          detected={detected}
          errors={errors}
          onAddStep={addStep}
          onPatch={patch}
          onRemoveStep={removeStep}
          onStepChange={changeStep}
          pending={pending}
          values={values}
        />
      )}
      <output aria-live="polite" className="muted">
        {progress}
      </output>
      {isCreate ? (
        <PortalReportWizardActions
          activeStep={activeStep}
          onBack={() => goToStep(Math.max(activeStep - 1, 0))}
          onContinue={continueToNextStep}
          pending={pending}
          submitText={submitLabel(mode, pending)}
        />
      ) : null}
      {mode.kind === "edit" ? (
        <PortalBugEditActions
          onCancel={handleCancel}
          pending={pending}
          submitText={submitLabel(mode, pending)}
        />
      ) : null}
    </form>
  );
};

export { PortalBugForm };

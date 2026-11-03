"use client";

import { useId, useRef, useState } from "react";
import { toast } from "sonner";

import {
  NO_FORM_ERRORS,
  fieldErrorProps,
  firstErrorField,
  formErrorsFrom,
} from "@/lib/field-errors";
import type { FormErrors } from "@/lib/field-errors";
import type { FieldErrors } from "@/src/server/core/action-result";

interface ActionFailureMessage {
  readonly message: string;
  readonly fieldErrors?: FieldErrors;
}

// Controls are found by the `${formId}-${field}` id the forms give them, so a
// custom picker's visible trigger gets focus rather than its hidden input.
const focusField = (
  form: HTMLFormElement | null,
  formId: string,
  field: string
): void => {
  const byId = form?.querySelector(`#${CSS.escape(`${formId}-${field}`)}`);
  const control = byId ?? form?.elements.namedItem(field);
  if (control instanceof HTMLElement) {
    control.focus();
  }
};

// Report failures in a toast and focus the first invalid field. Field messages
// remain available to assistive technology through aria-describedby.
const useFormErrors = (formFields: readonly string[]) => {
  const formId = useId();
  const formRef = useRef<HTMLFormElement>(null);
  const [errors, setErrors] = useState<FormErrors>(NO_FORM_ERRORS);

  const showFailure = (failure: ActionFailureMessage): void => {
    const next = formErrorsFrom(failure, formFields);
    setErrors(next);
    const messages = [
      ...new Set([next.form, ...Object.values(next.fields)].filter(Boolean)),
    ];
    toast.error(messages.join(" ") || failure.message);
    const field = firstErrorField(next, formFields);
    if (field) {
      focusField(formRef.current, formId, field);
    }
  };
  const showFormError = (message: string): void => {
    setErrors({ fields: {}, form: message });
    toast.error(message);
  };
  const clearErrors = (): void => setErrors(NO_FORM_ERRORS);
  const fieldProps = (field: string, hintId?: string) =>
    fieldErrorProps(errors, formId, field, hintId);

  return {
    clearErrors,
    errors,
    fieldProps,
    formId,
    formRef,
    showFailure,
    showFormError,
  };
};

export { useFormErrors };

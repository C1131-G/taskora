/* eslint-disable shadcn/no-unknown-classes -- Workspace classes are defined in apps/web/app/workspace-styles. */

import { fieldErrorId } from "@/lib/field-errors";
import type { FormErrors } from "@/lib/field-errors";

// The field's aria-describedby points to this screen-reader-only message.
const WorkspaceFieldError = ({
  errors,
  field,
  formId,
}: {
  readonly errors: FormErrors;
  readonly field: string;
  readonly formId: string;
}) => {
  const message = errors.fields[field];
  return message ? (
    <span className="sr-only" id={fieldErrorId(formId, field)}>
      {message}
    </span>
  ) : null;
};

// Form-level failures are reported by useFormErrors through a toast.
const WorkspaceFormError = (_props: { readonly errors: FormErrors }) => null;

export { WorkspaceFieldError, WorkspaceFormError };

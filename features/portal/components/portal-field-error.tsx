"use client";

/* eslint-disable shadcn/no-unknown-classes -- Portal pages reuse the workspace stylesheet classes. */

import type {
  Errors,
  FieldKey,
} from "@/features/portal/components/portal-bug-form-model";

import { errorId } from "./portal-field-support";

export const FieldError = ({
  errors,
  field,
}: {
  readonly errors: Errors;
  readonly field: FieldKey;
}) =>
  errors[field] ? (
    <p className="sr-only" id={errorId(field)}>
      {errors[field]}
    </p>
  ) : null;

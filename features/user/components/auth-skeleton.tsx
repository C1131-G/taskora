/* eslint-disable shadcn/no-unknown-classes -- Auth screens are styled by features/user/styles/*.css. */

import type { ReactNode } from "react";

// Placeholders mirror the real auth form rows so the card keeps its height.
const AuthFieldSkeleton = ({
  tall = false,
  withHint = false,
}: {
  // A multi-line field, as tall as the real textarea (`min-h-32`).
  readonly tall?: boolean;
  readonly withHint?: boolean;
}) => (
  <div aria-hidden="true" className="auth-field">
    <span className="auth-skeleton-text auth-skeleton-label" />
    <span
      className={tall ? "auth-skeleton-input min-h-32" : "auth-skeleton-input"}
    />
    {withHint ? (
      <span className="auth-skeleton-text auth-skeleton-hint" />
    ) : null}
  </div>
);

// A single busy region named for the form it stands in for.
const AuthFormSkeleton = ({
  children,
  label,
}: {
  readonly children: ReactNode;
  readonly label: string;
}) => (
  <output aria-busy="true" aria-label={label} className="auth-form">
    <span className="sr-only">{label}</span>
    {children}
    <span aria-hidden="true" className="auth-skeleton-button" />
  </output>
);

export { AuthFieldSkeleton, AuthFormSkeleton };

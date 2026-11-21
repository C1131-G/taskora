/* eslint-disable shadcn/no-unknown-classes -- Public intake screens reuse the auth chrome styles. */

import { connection } from "next/server";

import { IntakeForm } from "@/features/intake/components/intake-form";
import {
  getPublicIntakeForm,
  issueIntakeFormToken,
} from "@/features/intake/intake-public-queries";
import {
  AuthFieldSkeleton,
  AuthFormSkeleton,
} from "@/features/user/components/auth-skeleton";

// The signed issue time makes this page per-request, so it opts out of
// prerendering before it reads the clock.
const IntakeFormSection = async ({ slug }: { readonly slug: string }) => {
  await connection();
  const form = await getPublicIntakeForm(slug);
  return (
    <>
      <p className="auth-foot-note">
        {form.name} · for {form.companyName}
      </p>
      <IntakeForm formToken={issueIntakeFormToken(slug)} slug={slug} />
    </>
  );
};

const IntakeFormSkeleton = () => (
  <>
    <span
      aria-hidden="true"
      className="auth-skeleton-text auth-skeleton-note"
    />
    <AuthFormSkeleton label="Loading report form">
      <AuthFieldSkeleton />
      <AuthFieldSkeleton tall />
      <AuthFieldSkeleton />
      <AuthFieldSkeleton />
    </AuthFormSkeleton>
  </>
);

export { IntakeFormSection, IntakeFormSkeleton };

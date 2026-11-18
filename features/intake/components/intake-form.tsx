"use client";

/* eslint-disable shadcn/no-restyle, shadcn/no-unknown-classes -- Public intake screens reuse the auth chrome styles. */

import { useRouter } from "next/navigation";
import { useState } from "react";
import type { FormEvent } from "react";
import { toast } from "sonner";

import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { AuthAlert } from "@/features/user/components/auth-alert";
import {
  AuthFieldSkeleton,
  AuthFormSkeleton,
} from "@/features/user/components/auth-skeleton";
import { AuthSubmitButton } from "@/features/user/components/auth-submit-button";
import { isRecord, isStringRecord } from "@/src/lib/type-guards";

const MAX_TITLE = 150;
const MAX_DESCRIPTION = 5000;
const MAX_EMAIL = 254;
const MAX_ATTACHMENT_BYTES = 5 * 1024 * 1024;
const ACCEPTED_TYPES =
  "image/png,image/jpeg,image/webp,image/gif,application/pdf,text/plain";

type FieldErrors = Readonly<Record<string, string>>;

const SEND_FAILED = "The report could not be sent.";

const readFailure = async (
  response: Response
): Promise<{ readonly fields: FieldErrors; readonly message: string }> => {
  try {
    const body: unknown = await response.json();
    const error =
      isRecord(body) && isRecord(body["error"]) ? body["error"] : {};
    return {
      fields: isStringRecord(error["fieldErrors"]) ? error["fieldErrors"] : {},
      message:
        typeof error["message"] === "string" ? error["message"] : SEND_FAILED,
    };
  } catch {
    return { fields: {}, message: SEND_FAILED };
  }
};

const FieldError = ({
  id,
  message,
}: {
  readonly id: string;
  readonly message: string | undefined;
}) =>
  message ? (
    <p className="sr-only" id={id}>
      <span>{message}</span>
    </p>
  ) : null;

const IntakeForm = ({
  formToken,
  slug,
}: {
  readonly formToken: string;
  readonly slug: string;
}) => {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");
  const [fields, setFields] = useState<FieldErrors>({});

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError("");
    setFields({});
    const data = new FormData(event.currentTarget);
    const file = data.get("attachment");
    if (file instanceof File && file.size > MAX_ATTACHMENT_BYTES) {
      setFields({ attachment: "Attachments can be at most 5 MB." });
      toast.error("Attachments can be at most 5 MB.");
      return;
    }
    setPending(true);
    try {
      const response = await fetch(`/api/intake/${encodeURIComponent(slug)}`, {
        body: data,
        method: "POST",
      });
      if (response.status === 201) {
        const body: unknown = await response.json();
        // The received page shows the reference only when it has the right shape.
        const reference =
          isRecord(body) && typeof body["referenceId"] === "string"
            ? `?ref=${encodeURIComponent(body["referenceId"])}`
            : "";
        router.push(`/intake/${encodeURIComponent(slug)}/received${reference}`);
        return;
      }
      const failure = await readFailure(response);
      setFields(failure.fields);
      setError(failure.message);
      toast.error(
        [failure.message, ...Object.values(failure.fields)].join(" ")
      );
    } catch {
      setError("The report could not be sent. Check your connection.");
      toast.error("The report could not be sent. Check your connection.");
    }
    setPending(false);
  };

  return (
    <>
      <AuthAlert id="intake-error" message={error} />
      <form className="auth-form" onSubmit={submit}>
        <input name="formToken" type="hidden" value={formToken} />
        <div className="auth-field">
          <label className="auth-label" htmlFor="intake-title">
            Title
          </label>
          <Input
            aria-describedby="intake-title-error"
            aria-invalid={fields["title"] ? true : undefined}
            className="auth-input"
            id="intake-title"
            maxLength={MAX_TITLE}
            name="title"
            placeholder="A short summary of the problem"
            required
          />
          <FieldError id="intake-title-error" message={fields["title"]} />
        </div>
        <div className="auth-field">
          <label className="auth-label" htmlFor="intake-description">
            What happened?
          </label>
          <Textarea
            aria-describedby="intake-description-error"
            aria-invalid={fields["description"] ? true : undefined}
            className="auth-input min-h-32"
            id="intake-description"
            maxLength={MAX_DESCRIPTION}
            name="description"
            placeholder="What you did, what you expected and what happened instead"
            required
          />
          <FieldError
            id="intake-description-error"
            message={fields["description"]}
          />
        </div>
        <div className="auth-field">
          <label className="auth-label" htmlFor="intake-email">
            Your email
          </label>
          <Input
            autoComplete="email"
            aria-describedby="intake-email-error"
            aria-invalid={fields["email"] ? true : undefined}
            className="auth-input"
            id="intake-email"
            maxLength={MAX_EMAIL}
            name="email"
            placeholder="you@company.com"
            required
            type="email"
          />
          <FieldError id="intake-email-error" message={fields["email"]} />
        </div>
        <div className="auth-field">
          <label className="auth-label" htmlFor="intake-attachment">
            Screenshot or file (optional, up to 5 MB)
          </label>
          <Input
            accept={ACCEPTED_TYPES}
            aria-describedby="intake-attachment-error"
            aria-invalid={fields["attachment"] ? true : undefined}
            className="auth-input"
            id="intake-attachment"
            name="attachment"
            type="file"
          />
          <FieldError
            id="intake-attachment-error"
            message={fields["attachment"]}
          />
        </div>
        {/* A decoy for scripts: people never see it, so it must stay empty. */}
        <div aria-hidden="true" className="sr-only">
          <label htmlFor="intake-website">Website</label>
          <input
            autoComplete="off"
            id="intake-website"
            name="website"
            tabIndex={-1}
            type="text"
          />
        </div>
        <AuthSubmitButton
          idleLabel="Send report"
          pending={pending}
          pendingLabel="Sending…"
        />
      </form>
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

export { IntakeForm, IntakeFormSkeleton };

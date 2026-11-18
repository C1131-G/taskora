import { Context, Effect, Layer } from "effect";

import { db } from "@/src/prisma/db";

import type { AppError } from "../core/action-result";
import { isUniqueConstraintViolation } from "../core/prisma-errors";
import { databaseError } from "../work/work-internal";
import { validateAttachment } from "./intake-attachment";
import type { IntakeAttachment } from "./intake-attachment";
import {
  MAX_DESCRIPTION_LENGTH,
  MAX_MESSAGE_ID_LENGTH,
  MAX_TITLE_LENGTH,
  UNKNOWN_SENDER,
  formTokenSecret,
  hashSenderAddress,
} from "./intake-config";
import { checkFormToken } from "./intake-guard";
import {
  cleanTitle,
  fieldFailure,
  parseEmailAddress,
  validateWebFields,
} from "./intake-input";
import {
  assertUnderRateLimit,
  createIntakeItem,
  failToken,
  loadOpenForm,
  storageKeyFor,
} from "./intake-item";
import { IntakeObjectStore } from "./intake-object-store";
import type { IntakeReceipt } from "./intake-shared";
import { newReferenceId } from "./intake-shared";

export interface WebSubmissionInput {
  readonly attachment: IntakeAttachment | null;
  readonly clientIp: string | undefined;
  readonly description: string;
  readonly email: string;
  readonly formToken: string;
  readonly slug: string;
  readonly title: string;
  // The honeypot: real people never see it, so it must come back empty.
  readonly website: string;
}

export interface EmailSubmissionInput {
  readonly from: string;
  readonly messageId: string;
  readonly slug: string;
  readonly subject: string;
  readonly text: string;
}

export interface EmailIntakeReceipt extends IntakeReceipt {
  readonly duplicate: boolean;
}

export interface PublicFormView {
  readonly companyName: string;
  readonly name: string;
}

export class IntakeSubmissions extends Context.Service<
  IntakeSubmissions,
  {
    readonly describeForm: (
      slug: string
    ) => Effect.Effect<PublicFormView, AppError>;
    readonly submitWeb: (
      input: WebSubmissionInput
    ) => Effect.Effect<IntakeReceipt, AppError>;
    readonly submitEmail: (
      input: EmailSubmissionInput
    ) => Effect.Effect<EmailIntakeReceipt, AppError>;
  }
>()("taskora/server/IntakeSubmissions") {}

const findDuplicate = async (formId: string, messageId: string) =>
  await db.orm.public.IntakeSubmission.where({ formId, messageId })
    .select("referenceId")
    .first();

const describeForm = (slug: string) =>
  Effect.tryPromise({
    catch: databaseError,
    try: () =>
      db.transaction(async (transaction) => {
        const form = await loadOpenForm(transaction, slug);
        return { companyName: form.companyName, name: form.name };
      }),
  });

const submitEmail = (input: EmailSubmissionInput) =>
  Effect.gen(function* submitEmailReport() {
    const messageId = input.messageId.trim();
    const email = parseEmailAddress(input.from);
    if (!messageId || messageId.length > MAX_MESSAGE_ID_LENGTH) {
      return yield* Effect.fail(
        fieldFailure("messageId", "A valid message id is required.")
      );
    }
    if (!email) {
      return yield* Effect.fail(
        fieldFailure("from", "The sender address is not valid.")
      );
    }
    const form = yield* Effect.tryPromise({
      catch: databaseError,
      try: () =>
        db.transaction((transaction) => loadOpenForm(transaction, input.slug)),
    });
    const title =
      cleanTitle(input.subject).slice(0, MAX_TITLE_LENGTH).trim() ||
      "(no subject)";
    const text = input.text.slice(0, MAX_DESCRIPTION_LENGTH);
    const existing = yield* Effect.tryPromise({
      catch: databaseError,
      try: () => findDuplicate(form.id, messageId),
    });
    if (existing) {
      return { duplicate: true, referenceId: existing.referenceId };
    }
    return yield* Effect.tryPromise({
      catch: (error) => error,
      try: () =>
        db.transaction(async (transaction) => ({
          ...(await createIntakeItem(transaction, form, {
            attachment: null,
            description: text.trim() || "(no text)",
            email,
            messageId,
            senderHash: null,
            source: "email",
            title,
          })),
          duplicate: false,
        })),
    }).pipe(
      Effect.catch((error) =>
        // Two deliveries of one message can race past the check above.
        isUniqueConstraintViolation(error)
          ? Effect.tryPromise({
              catch: databaseError,
              try: async () => {
                const winner = await findDuplicate(form.id, messageId);
                if (!winner) {
                  throw error;
                }
                return { duplicate: true, referenceId: winner.referenceId };
              },
            })
          : Effect.fail(databaseError(error))
      )
    );
  });

export const IntakeSubmissionsLive = Layer.effect(
  IntakeSubmissions,
  Effect.gen(function* makeIntakeSubmissions() {
    const objects = yield* IntakeObjectStore;

    const submitWeb = (input: WebSubmissionInput) =>
      Effect.gen(function* submitWebReport() {
        const form = yield* Effect.tryPromise({
          catch: databaseError,
          try: () =>
            db.transaction((transaction) =>
              loadOpenForm(transaction, input.slug)
            ),
        });
        if (input.website.trim()) {
          // A bot filled the hidden field. Look like success, store nothing.
          return { referenceId: newReferenceId() };
        }
        const verdict = checkFormToken(
          formTokenSecret(),
          input.slug,
          input.formToken,
          Date.now()
        );
        if (verdict !== "ok") {
          return yield* Effect.fail(failToken(verdict));
        }
        const fields = yield* Effect.try({
          catch: databaseError,
          try: () => validateWebFields(input),
        });
        const upload = input.attachment;
        const attachment = upload
          ? yield* Effect.try({
              catch: databaseError,
              try: () => validateAttachment(upload),
            })
          : null;
        const senderHash = hashSenderAddress(input.clientIp ?? UNKNOWN_SENDER);
        const storageKey = attachment ? storageKeyFor(form.id) : null;
        if (attachment && storageKey) {
          yield* objects.put(
            storageKey,
            attachment.contentType,
            attachment.bytes
          );
        }
        return yield* Effect.tryPromise({
          catch: databaseError,
          try: () =>
            db.transaction(async (transaction) => {
              await assertUnderRateLimit(transaction, senderHash);
              return await createIntakeItem(transaction, form, {
                attachment:
                  attachment && storageKey
                    ? { ...attachment, storageKey }
                    : null,
                description: fields.description,
                email: fields.email,
                messageId: null,
                senderHash,
                source: "web",
                title: fields.title,
              });
            }),
        }).pipe(
          Effect.tapError(() =>
            storageKey ? Effect.ignore(objects.remove(storageKey)) : Effect.void
          )
        );
      });

    return IntakeSubmissions.of({ describeForm, submitEmail, submitWeb });
  })
);

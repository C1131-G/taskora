import { randomUUID } from "node:crypto";

import { AppError } from "../core/action-result";
import { severityForImpact } from "../portal/portal-bug-access";
import { createBugReport } from "../work/bug-management";
import { createBugSla } from "../work/bug-sla";
import { announceClientBug } from "../work/bug-workflow-pick";
import type { Transaction } from "../work/work-internal";
import type { IntakeAttachment } from "./intake-attachment";
import {
  EXTERNAL_REPORTER_EMAIL,
  EXTERNAL_REPORTER_NAME,
  WEB_RATE_LIMIT,
  WEB_RATE_WINDOW_MS,
  externalReporterId,
} from "./intake-config";
import { buildDescription } from "./intake-input";
import type { IntakeReceipt } from "./intake-shared";
import {
  ACTUAL_BEHAVIOR_LENGTH,
  newReferenceId,
  unavailable,
} from "./intake-shared";

export const loadOpenForm = async (transaction: Transaction, slug: string) => {
  const form = await transaction.orm.public.IntakeForm.where({ slug })
    .select("id", "name", "enabled", "clientCompanyId", "projectId")
    .first();
  if (!form?.enabled) {
    throw unavailable();
  }
  const [company, project] = await Promise.all([
    transaction.orm.public.ClientCompany.where({ id: form.clientCompanyId })
      .select("name", "deactivatedAt")
      .first(),
    transaction.orm.public.Project.where({ id: form.projectId })
      .select("archivedAt")
      .first(),
  ]);
  if (!company || company.deactivatedAt || !project || project.archivedAt) {
    throw unavailable();
  }
  return { ...form, companyName: company.name };
};

type OpenForm = Awaited<ReturnType<typeof loadOpenForm>>;

const ensureExternalReporter = async (
  transaction: Transaction
): Promise<void> => {
  const now = new Date();
  await transaction.orm.public.User.upsert({
    conflictOn: { id: externalReporterId },
    create: {
      banned: true,
      createdAt: now,
      email: EXTERNAL_REPORTER_EMAIL,
      emailNormalized: EXTERNAL_REPORTER_EMAIL,
      emailVerified: false,
      id: externalReporterId,
      mustChangePassword: false,
      name: EXTERNAL_REPORTER_NAME,
      role: "employee",
      updatedAt: now,
    },
    update: { name: EXTERNAL_REPORTER_NAME },
  });
};

interface NewIntakeItem {
  readonly attachment:
    | (IntakeAttachment & { readonly storageKey: string })
    | null;
  readonly description: string;
  readonly email: string;
  readonly messageId: string | null;
  readonly senderHash: string | null;
  readonly source: "email" | "web";
  readonly title: string;
}

// Creates the triage bug, its SLA clock, the submission record and the
// notifications in one transaction, so a failure leaves nothing behind.
export const createIntakeItem = async (
  transaction: Transaction,
  form: OpenForm,
  item: NewIntakeItem
): Promise<IntakeReceipt> => {
  await ensureExternalReporter(transaction);
  const via = item.source === "web" ? "web form" : "email";
  const now = new Date();
  const bug = await createBugReport(
    transaction,
    externalReporterId,
    {
      actualBehavior:
        item.description.slice(0, ACTUAL_BEHAVIOR_LENGTH).trim() ||
        "See the description.",
      appVersion: null,
      browser: null,
      component: "Intake",
      description: buildDescription(item.description, {
        email: item.email,
        via,
      }),
      device: null,
      discoverySource: "customer_report",
      environment: "production",
      expectedBehavior: "Not provided by the external reporter.",
      os: null,
      projectId: form.projectId,
      reproductionSteps: ["See the description."],
      route: `Intake ${via}: ${form.name}`,
      severity: severityForImpact.medium,
      title: item.title,
    },
    { clientCompanyId: form.clientCompanyId, clientImpact: "medium" }
  );
  await createBugSla(transaction, { bugId: bug.id, impact: "medium", now });
  const referenceId = newReferenceId();
  await transaction.orm.public.IntakeSubmission.create({
    bugReportId: bug.id,
    createdAt: now,
    formId: form.id,
    id: randomUUID(),
    messageId: item.messageId,
    referenceId,
    reporterEmail: item.email,
    senderHash: item.senderHash,
    source: item.source,
  });
  if (item.attachment) {
    await transaction.orm.public.FileAsset.create({
      contentType: item.attachment.contentType,
      copyState: "ready",
      createdAt: now,
      id: randomUUID(),
      originalName: item.attachment.fileName,
      projectId: form.projectId,
      sizeBytes: BigInt(item.attachment.bytes.byteLength),
      storageKey: item.attachment.storageKey,
      taskId: bug.taskId,
      uploadedById: externalReporterId,
    });
  }
  await announceClientBug(transaction, {
    bugId: bug.id,
    includeAdmins: true,
    now,
    reporterId: externalReporterId,
    text: `New intake report (${via}) for ${form.companyName}`,
  });
  return { referenceId };
};

export const assertUnderRateLimit = async (
  transaction: Transaction,
  senderHash: string
): Promise<void> => {
  const since = new Date(Date.now() - WEB_RATE_WINDOW_MS);
  const recent = await transaction.orm.public.IntakeSubmission.where(
    (submission) => submission.senderHash.eq(senderHash)
  )
    .where((submission) => submission.createdAt.gte(since))
    .select("id")
    .all();
  if (recent.length >= WEB_RATE_LIMIT) {
    throw new AppError({
      code: "RATE_LIMITED",
      message: "Too many reports from your network. Try again later.",
    });
  }
};

export const failToken = (
  verdict: "expired" | "invalid" | "too_fast"
): AppError =>
  new AppError({
    code: "VALIDATION_FAILED",
    message:
      verdict === "too_fast"
        ? "That was quick. Please review your report and send it again."
        : "This form has expired. Reload the page and try again.",
  });

export const storageKeyFor = (formId: string): string =>
  `company/intake/${formId}/${randomUUID()}`;

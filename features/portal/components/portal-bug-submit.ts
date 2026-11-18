import { toast } from "sonner";

import { toPayload } from "@/features/portal/components/portal-bug-form-model";
import type { Values } from "@/features/portal/components/portal-bug-form-model";
import type { CapturedScreenshot } from "@/features/portal/components/portal-screenshot-capture";
import {
  editClientBugAction,
  submitClientBugAction,
} from "@/features/portal/portal-bug-actions";
import type { parseContext } from "@/features/portal/portal-context-store";
import type { parseEnvironment } from "@/features/portal/portal-environment";
import { recordFailedUploads } from "@/features/portal/portal-failed-uploads";
import { withReportExtras } from "@/features/portal/portal-report-extras";
import { uploadPortalFiles } from "@/features/portal/portal-upload";

import { conflictMessage } from "./portal-bug-form-mode";

interface CreateBugInput {
  readonly captured: CapturedScreenshot | null;
  readonly context: ReturnType<typeof parseContext>;
  readonly detected: ReturnType<typeof parseEnvironment>;
  readonly files: readonly File[];
  readonly idempotencyKey: string;
  readonly onProgress: (message: string) => void;
  readonly recurrenceOfBugId: string | undefined;
  readonly sendContext: boolean;
  readonly values: Values;
}

// Files the report, then uploads its screenshots once the bug exists. Answers
// the new bug's id, or null after telling the person why it was refused.
export const createBug = async (
  input: CreateBugInput
): Promise<string | null> => {
  const { captured, context, detected, files, sendContext, values } = input;
  const result = await submitClientBugAction({
    ...withReportExtras(toPayload(values, detected), {
      context,
      screenshotDescription: captured?.description,
      sendContext,
    }),
    idempotencyKey: input.idempotencyKey,
    projectId: values.projectId,
    ...(input.recurrenceOfBugId
      ? { recurrenceOfBugId: input.recurrenceOfBugId }
      : {}),
  });
  if (!result.ok) {
    toast.error(result.error.message);
    return null;
  }
  const { bugId } = result.data;
  const toUpload = captured ? [captured.file, ...files] : [...files];
  const failures = await uploadPortalFiles(bugId, toUpload, (index, file) =>
    input.onProgress(
      `Uploading file ${index + 1} of ${toUpload.length}: ${file.name}`
    )
  );
  recordFailedUploads(bugId, failures);
  return bugId;
};

interface EditBugInput {
  readonly bug: { readonly id: string; readonly version: number };
  readonly detected: ReturnType<typeof parseEnvironment>;
  readonly idempotencyKey: string;
  readonly values: Values;
}

// Answers whether the edit was saved, after telling the person if it was not.
export const editBug = async ({
  bug,
  detected,
  idempotencyKey,
  values,
}: EditBugInput): Promise<boolean> => {
  const result = await editClientBugAction({
    ...toPayload(values, detected),
    bugId: bug.id,
    expectedVersion: bug.version,
    idempotencyKey,
  });
  if (!result.ok) {
    toast.error(
      result.error.code === "CONFLICT" ? conflictMessage : result.error.message
    );
    return false;
  }
  return true;
};
